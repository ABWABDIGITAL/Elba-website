import Branch from "../models/branches.model.js";
import ApiError, { BadRequest, NotFound, ServerError } from "../utlis/apiError.js";
import ApiFeatures from "../utlis/apiFeatures.js";

/* --------------------------------------------------
   BUILD BRANCH DTO
--------------------------------------------------- */
const buildBranchDTO = (branch, language = "ar") => {
  const langData = branch[language] || branch.ar;

  return {
    id: branch._id,
    name: langData.name,
    address: langData.address,
    city: langData.city,
    region: langData.region,
    services: langData.services || [],
    description: langData.description,
    regionCode: branch.regionCode,
    phones: branch.phones,
    email: branch.email,
    whatsapp: branch.whatsapp,
    location: branch.location,
    workingHours: branch.workingHours,
    manager: branch.manager,
    hasParking: branch.hasParking,
    hasDisabledAccess: branch.hasDisabledAccess,
    hasCafeteria: branch.hasCafeteria,
    hasShowroom: branch.hasShowroom,
    images: branch.images,
    isFeatured: branch.isFeatured,
    displayOrder: branch.displayOrder,
    isOpenNow: branch.isOpenNow ? branch.isOpenNow() : undefined,
    createdAt: branch.createdAt,
    updatedAt: branch.updatedAt,
  };
};

/* --------------------------------------------------
   CREATE BRANCH
--------------------------------------------------- */
export const createBranchService = async (branchData) => {
  try {
    const branch = await Branch.create(branchData);
    return branch;
  } catch (err) {
    throw ServerError("Failed to create branch", err);
  }
};

/* --------------------------------------------------
   GET BRANCH BY ID
--------------------------------------------------- */
export const getBranchService = async (id, language = "ar") => {
  try {
    const branch = await Branch.findOne({ _id: id, isActive: true });

    if (!branch) throw NotFound("Branch not found");

    return buildBranchDTO(branch.toObject(), language);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw BadRequest("Invalid branch ID");
  }
};

/* --------------------------------------------------
   UPDATE BRANCH
--------------------------------------------------- */
export const updateBranchService = async ({ id, data }) => {
  try {
    const branch = await Branch.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!branch) throw NotFound("Branch not found");

    return branch;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to update branch", err);
  }
};

/* --------------------------------------------------
   DELETE BRANCH (SOFT DELETE)
--------------------------------------------------- */
export const deleteBranchService = async (id) => {
  try {
    const branch = await Branch.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!branch) throw NotFound("Branch not found");

    return branch;
  } catch (err) {
    throw ServerError("Failed to delete branch", err);
  }
};

/* --------------------------------------------------
   GET ALL BRANCHES
--------------------------------------------------- */
export const getBranchesService = async (query) => {
  try {
    const { language = "ar", ...restQuery } = query;

    const features = new ApiFeatures(
      Branch.find({ isActive: true }),
      restQuery,
      {
        allowedFilterFields: ["regionCode", `${language}.city`],
        searchFields: [
          `${language}.name`,
          `${language}.address`,
          `${language}.city`,
        ],
      }
    );

    // Execute the query
    const branches = await features.mongooseQuery;
    const total = await Branch.countDocuments(features.mongooseQuery._conditions);

    return {
      count: branches.length,
      total,
      data: branches
    };
  } catch (err) {
    console.error('Error in getBranchesService:', err);
    throw new Error("Failed to fetch branches");
  }
};    

/* --------------------------------------------------
   GET BRANCHES BY REGION
--------------------------------------------------- */
export const getBranchesByRegionService = async (regionCode, language = "ar") => {
  try {
    const branches = await Branch.getByRegion(regionCode, language);

    return branches.map((branch) => buildBranchDTO(branch, language));
  } catch (err) {
    throw ServerError("Failed to fetch branches by region", err);
  }
};

/* --------------------------------------------------
   GET NEARBY BRANCHES
--------------------------------------------------- */
export const getNearbyBranchesService = async (
  longitude,
  latitude,
  maxDistance = 50000,
  language = "ar"
) => {
  try {
    if (!longitude || !latitude) {
      throw BadRequest("Longitude and latitude are required");
    }

    const branches = await Branch.findNearby(
      parseFloat(longitude),
      parseFloat(latitude),
      parseInt(maxDistance),
      language
    ).lean();

    return branches.map((branch) => buildBranchDTO(branch, language));
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to find nearby branches", err);
  }
};

/* --------------------------------------------------
   GET FEATURED BRANCHES
--------------------------------------------------- */
export const getFeaturedBranchesService = async (limit = 5, language = "ar") => {
  try {
    const branches = await Branch.getFeatured(parseInt(limit));

    return branches.map((branch) => buildBranchDTO(branch, language));
  } catch (err) {
    throw ServerError("Failed to fetch featured branches", err);
  }
};

/* --------------------------------------------------
   CHECK IF BRANCH IS OPEN
--------------------------------------------------- */
export const checkBranchOpenStatusService = async (id) => {
  try {
    const branch = await Branch.findOne({ _id: id, isActive: true });

    if (!branch) throw NotFound("Branch not found");

    const isOpen = branch.isOpenNow();
    const now = new Date();
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayName = days[now.getDay()];
    const todayHours = branch.workingHours[dayName];

    return {
      isOpen,
      currentDay: dayName,
      todayHours: todayHours.isClosed
        ? { isClosed: true }
        : { open: todayHours.open, close: todayHours.close },
      currentTime: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to check branch status", err);
  }
};
