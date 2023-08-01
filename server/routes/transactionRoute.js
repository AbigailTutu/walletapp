import express from "express";
import { Transaction } from "../models/transactionModel.js";
import { User } from "../models/userModel.js";
import { decrypt } from "../middlewares/authMiddleware.js";
import validator from "validator";

const router = express.Router();

const getUserIdByEmail = async (email) => {
  try {
    const user = await User.findOne({ email });
    return user ? user._id : "";
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return "";
  }
  
  
};

//transfer money from one account to another
// decrypt will validate the jwt tokek. If its oken then transaction will move to the try block

router.post("/fund-transfer", decrypt, async (req, res) => {
  try {
    //check if user is active, sender has funds and receiver has all the criteria to receive the funds

    //first save the transaction
    const newTransaction = new Transaction(req.body);
    await newTransaction.save();

    const sendId = await getUserIdByEmail(req.body.sender);
    const receiverId = await getUserIdByEmail(req.body.receiver);

    const maker = await User.findOne({ email: req.body.sender });

    //check for availablebalance
    if (req.body.amount > maker.avlbal) {
      return res.send({
        message: "Insuficient Funds",
        success: false,
      });
    }

    //decrease sender balance ie debit sender.
    await User.findByIdAndUpdate(sendId, {
      $inc: { avlbal: -req.body.amount }, // $inc = increment ie mongodb method
    });

    //increase receivers balance
    await User.findByIdAndUpdate(receiverId, {
      $inc: { avlbal: req.body.amount },
    });

    res.send({
      message: "Transaction successfull",
      data: newTransaction,
      success: true,
    });
  } catch (error) {
    res.send({
      message: "Transaction failed",
      data: error.message,
      success: false,
    });
  }
});

// verify the receiver account
router.post("/verify-accout", decrypt, async (req, res) => {
  try {
    const sender = await User.findById(req.body.userId);

    const user = await User.findOne({ email: req.body.receiver });

    // if the sender uses his own email for verification it should fail
    if (user.email === sender.email) {
     return res.send({
        message: "Do not use your own account",
        data: sender,
        success: false,
      });
    }


    if (user) {
      res.send({
        message: "Account verified",
        data: user,
        success: true,
      });
    } else {
      res.send({
        message: "Account not found",
        data: null,
        success: false,
      });
    }
  } catch (error) {
    res.send({
      message: "Account not found",
      data: null,
      success: false,
    });
  }
});

export { router as transactionRouter };
