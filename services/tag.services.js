import Tag from "../models/tag.model.js";
import Product from "../models/product.model.js";
import { BadRequest, NotFound, ServerError } from "../utlis/apiError.js";
import slugify from "slugify";

/* --------------------------------------------------
   TAG DTO
--------------------------------------------------- */
export const buildTagDTO = (t) => {
  if (!t) return null;
  return {
    id: t._id,
    name: t.name,
    slug: t.slug,
    type: t.type,
    icon: t.icon,
    status: t.status,
    isSystem: t.isSystem,
    automationKey: t.automationKey || null,
    productCount: t.productCount || 0,
    createdAt: t.createdAt,
  };
};

/* --------------------------------------------------
   CREATE TAG
--------------------------------------------------- */
export const createTagService = async (data) => {
  try {
    const slug = slugify(data.name?.en || "", { lower: true, strict: true });
    const exists = await Tag.findOne({ slug });
    if (exists) throw BadRequest("Tag with this name already exists");

    const tag = new Tag({ ...data, slug });
    await tag.save();

    return {
      OK: true,
      message: "Tag created successfully",
      data: buildTagDTO(tag),
    };
  } catch (err) {
    if (err.statusCode) throw err;
    throw ServerError("Failed to create tag", err.message);
  }
};

/* --------------------------------------------------
   GET ALL TAGS
--------------------------------------------------- */
export const getAllTagsService = async (query = {}) => {
  try {
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;

    const tags = await Tag.find(filter).sort({ createdAt: -1 }).lean();

    return {
      OK: true,
      message: "Tags fetched successfully",
      data: tags.map(buildTagDTO),
    };
  } catch (err) {
    throw ServerError("Failed to get tags", err.message);
  }
};

/* --------------------------------------------------
   GET TAG BY ID
--------------------------------------------------- */
export const getTagByIdService = async (id) => {
  try {
    const tag = await Tag.findById(id).lean();
    if (!tag) throw NotFound("Tag not found");

    return {
      OK: true,
      message: "Tag fetched successfully",
      data: buildTagDTO(tag),
    };
  } catch (err) {
    if (err.statusCode) throw err;
    throw ServerError("Failed to get tag", err.message);
  }
};

/* --------------------------------------------------
   UPDATE TAG
--------------------------------------------------- */
export const updateTagService = async (id, data) => {
  try {
    const tag = await Tag.findById(id);
    if (!tag) throw NotFound("Tag not found");

    if (data.name?.en) tag.name.en = data.name.en;
    if (data.name?.ar) tag.name.ar = data.name.ar;
    if (data.icon !== undefined) tag.icon = data.icon;
    if (data.status) tag.status = data.status;
    if (data.type) tag.type = data.type;

    await tag.save();

    return {
      OK: true,
      message: "Tag updated successfully",
      data: buildTagDTO(tag),
    };
  } catch (err) {
    if (err.statusCode) throw err;
    throw ServerError("Failed to update tag", err.message);
  }
};

/* --------------------------------------------------
   DELETE TAG
--------------------------------------------------- */
export const deleteTagService = async (id) => {
  try {
    const tag = await Tag.findById(id);
    if (!tag) throw NotFound("Tag not found");
    if (tag.isSystem) throw BadRequest("Cannot delete system tags");

    // Remove tag reference from all products
    await Product.updateMany({ tags: tag._id }, { $pull: { tags: tag._id } });

    await Tag.findByIdAndDelete(id);

    return {
      OK: true,
      message: "Tag deleted successfully",
    };
  } catch (err) {
    if (err.statusCode) throw err;
    throw ServerError("Failed to delete tag", err.message);
  }
};

/* --------------------------------------------------
   RECALCULATE TAG PRODUCT COUNTS
--------------------------------------------------- */
export const recalcTagCountsService = async () => {
  try {
    const tags = await Tag.find({});

    for (const tag of tags) {
      const count = await Product.countDocuments({ tags: tag._id });
      tag.productCount = count;
      await tag.save();
    }

    return {
      OK: true,
      message: "Tag counts recalculated successfully",
    };
  } catch (err) {
    throw ServerError("Failed to recalculate tag counts", err.message);
  }
};
