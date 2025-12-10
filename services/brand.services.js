import Brand from "../models/brand.model.js";
import slugify from "slugify";
import fs from "fs";
import path from "path";

export const createBrand = async ({ en, ar, logo }) => {
  try {
    if (!en?.name || !ar?.name || !logo) {
      return { OK: false, error: "English and Arabic names and logo are required." };
    }

    const enName = en.name.replace(/\s+/g, " ").trim();
    const arName = ar.name.replace(/\s+/g, " ").trim();

    // Check if brand exists (Arabic OR English)
    const exists = await Brand.findOne({
      $or: [
        { "en.name": { $regex: `^${enName}$`, $options: "i" } },
        { "ar.name": { $regex: `^${arName}$`, $options: "i" } },
      ],
    });

    if (exists) {
      return { OK: false, error: "Brand already exists in Arabic or English." };
    }

    const brand = await Brand.create({
      en: {
        name: enName,
        slug: slugify(enName, { lower: true }),
      },
      ar: {
        name: arName,
        slug: slugify(arName, { lower: true }),
      },
      logo,
    });

    return { OK: true, data: brand };

  } catch (err) {
    console.log(err);
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

export const updateBrand = async ({ id, en, ar, logo ,status }) => {
  try {
    const brand = await Brand.findById(id);
    if (!brand) return { OK: false, error: "Brand not found." };
    // Handle English name update
    if (en?.name) {
      const cleanedEnName = en.name.replace(/\s+/g, " ").trim();

      const exists = await Brand.findOne({
        "en.name": { $regex: `^${cleanedEnName}$`, $options: "i" },
        _id: { $ne: id },
      });

      if (exists) {
        return { OK: false, error: "English name already exists." };
      }

      brand.en.name = cleanedEnName;
      brand.en.slug = slugify(cleanedEnName, { lower: true });
    }

    // Handle Arabic name update
    if (ar?.name) {
      const cleanedArName = ar.name.replace(/\s+/g, " ").trim();

      const exists = await Brand.findOne({
        "ar.name": { $regex: `^${cleanedArName}$`, $options: "i" },
        _id: { $ne: id },
      });

      if (exists) {
        return { OK: false, error: "Arabic name already exists." };
      }

      brand.ar.name = cleanedArName;
      brand.ar.slug = slugify(cleanedArName, { lower: true });
    }

    // Handle logo update
    if (logo) {
      const realOldLogo = brand.logo.startsWith("http")
        ? brand.logo.replace(process.env.BASE_URL + "/", "")
        : brand.logo;

      const oldImagePath = path.join(process.cwd(), realOldLogo);

      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }

      brand.logo = logo;
    }
    if (status) brand.status = status;

    await brand.save();

    return { OK: true, data: brand };

  } catch (err) {
    console.log(err);
    return { OK: false, error: "Server error." };
  }
};


export const deleteBrand = async ({ id }) => {
  try {
    const brand = await Brand.findById(id);
    if (!brand) return { OK: false, error: "Brand not found." };

    if (brand.logo) {
      const imgPath = path.join(process.cwd(), brand.logo);
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
