import Brand from "../models/brand.model.js";
import slugify from "slugify";
import fs from "fs";
import path from "path";

export const createBrand = async ({ name, image }) => {
  try {
    if (!name || !image) {
      return { OK: false, error: "Name and image are required." };
    }

    const cleanedName = name.replace(/\s+/g, " ").trim();

    const exists = await Brand.findOne({
      name: { $regex: `^${cleanedName}$`, $options: "i" },
    });

    if (exists) {
      return { OK: false, error: "Brand already exists." };
    }

    const brand = await Brand.create({
      name: cleanedName,
      slug: slugify(cleanedName, { lower: true }),
      image,
    });

    return { OK: true, data: brand };
  } catch (err) {
    return { OK: false, error: "Server error." };
  }
};

export const getBrands = async () => {
  try {
    const brands = await Brand.find({});
    return { OK: true, data: brands };
  } catch (err) {
    return { OK: false, error: "Server error." };
  }
};

export const getBrand = async ({ id }) => {
  try {
    const brand = await Brand.findById(id);
    if (!brand) return { OK: false, error: "Brand not found." };
    return { OK: true, data: brand };
  } catch (err) {
    return { OK: false, error: "Invalid ID." };
  }
};

export const updateBrand = async ({ id, name, image }) => {
  try {
    const brand = await Brand.findById(id);
    if (!brand) return { OK: false, error: "Brand not found." };

    if (name) {
      const cleanedName = name.replace(/\s+/g, " ").trim();

      const exists = await Brand.findOne({
        name: { $regex: `^${cleanedName}$`, $options: "i" },
        _id: { $ne: id },
      });

      if (exists) {
        return {
          OK: false,
          error: "A brand with this name already exists.",
        };
      }

      brand.name = cleanedName;
      brand.slug = slugify(cleanedName, { lower: true });
    }

    if (image) {
      const oldImagePath = path.join(process.cwd(), brand.image);

      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }

      brand.image = image;
    }

    await brand.save();

    return { OK: true, data: brand };
  } catch (err) {
    return { OK: false, error: "Server error." };
  }
};

export const deleteBrand = async ({ id }) => {
  try {
    const brand = await Brand.findById(id);
    if (!brand) return { OK: false, error: "Brand not found." };

    if (brand.image) {
      const imgPath = path.join(process.cwd(), brand.image);
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }

    await Brand.findByIdAndDelete(id);

    return { OK: true, data: brand };
  } catch (err) {
    return { OK: false, error: "Server error." };
  }
};
