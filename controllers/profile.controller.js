import { updateProfileService , getProfileService } from "../services/profile.services.js";

export const updateProfileController = async (req, res, next) => {
  try {
    const userId = req.user.id;      // Authenticated user from token middleware
    const data = req.body;

    const result = await updateProfileService(userId, data);

    res.status(200).json(result);

  } catch (err) {
    next(err);
  }
};
export const getAllProfileController = async(req ,res , next)=>
{
  try {
    const result = await getProfileService(req.user.id);
    res.status(200).json({
      success:true,
      message:"Profile fetched successfully",
      data:result
    });
  } catch (error) {
    next(error);
  }
}