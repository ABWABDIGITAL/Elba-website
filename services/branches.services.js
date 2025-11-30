import Branch from "../models/branches.model.js";
import ApiError, { BadRequest, Forbidden, NotFound, ServerError } from "../utlis/apiError.js";
import ApiFeatures from "../utlis/apiFeatures.js";


export const createBranchService = async ({
  name_ar,
  name_en,
  region,
  city,
  address,
  phones,
  location,
  workingHours,
  services,
}) => {
  try {
    const branch = await Branch.create({
      name_ar,
      name_en,
      region,
      city,
      address,
      phones,
      location,
      workingHours,
      services,
    });

    return branch;
  } catch (err) {
    throw ServerError("Failed to create branch", err);
  }
};

export const getBranchService = async (id) => {
  try {
    const branch = await Branch.findById(id);

    if (!branch) throw NotFound("Branch not found");

    return branch;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw BadRequest("Invalid branch ID");
  }
};

export const updateBranchService = async ({ id, data }) => {
  try {
    const branch = await Branch.findByIdAndUpdate(id, data, { new: true });

    if (!branch) throw NotFound("Branch not found");

    return branch;
  } catch (err) {
    throw ServerError("Failed to update branch", err);
  }
};

export const deleteBranchService = async (id) => {
  try {
    const branch = await Branch.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!branch) throw NotFound("Branch not found");

    return branch;
  } catch (err) {
    throw ServerError("Failed to delete branch", err);
  }
};


export const getBranchesService = async (query) => {
  try {
    const features = new ApiFeatures(
      Branch.find({ isActive: true }),
      query,
      {
        allowedFilterFields: ["region", "city"],
        searchFields: ["name_ar", "name_en", "address", "city"],
      }
    );

    features.filter().search().sort().limitFields().paginate();

    const data = await features.mongooseQuery;
    const total = await Branch.countDocuments(features.getFilter());

    return {
      data,
      pagination: features.buildPaginationResult(total),
    };
  } catch (err) {
    throw ServerError("Failed to fetch branches", err);
  }
};
