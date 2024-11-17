import ExpoPushToken from "../models/expoPushTokenModel.js";

const addExpoPushToken = async (req, res) => {
  try {
    const { user, userType } = req;
    const { expoPushToken } = req.body;

    const existingPushTokens = await ExpoPushToken.findOne({ user, userType });

    if (existingPushTokens) {
      if (!existingPushTokens.expoPushTokens.includes(expoPushToken)) {
        existingPushTokens.expoPushTokens.push(expoPushToken);
        await existingPushTokens.save();
      }
    } else {
      await ExpoPushToken.create({
        user,
        userType,
        expoPushTokens: [expoPushToken],
      });
    }

    res.status(201).json({ message: "ExpoPushToken added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error adding ExpoPushToken" });
  }
};

const removeExpoPushToken = async (req, res) => {
  try {
    const { user, userType, expoPushTokenToRemove } = req.body;

    const existingPushTokens = await ExpoPushToken.findOne({ user, userType });

    if (existingPushTokens) {
      // Filter out the expoPushToken to remove
      existingPushTokens.expoPushTokens =
        existingPushTokens.expoPushTokens.filter(
          (token) => token !== expoPushTokenToRemove
        );
      await existingPushTokens.save();
    }

    res.status(200).json({ message: "ExpoPushToken removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error removing ExpoPushToken" });
  }
};

export { addExpoPushToken, removeExpoPushToken };
