// src/utils/ApiFeatures.js
export default class ApiFeatures {
  /**
   * @param {import("mongoose").Query} mongooseQuery - Mongoose query (ex: Product.find())
   * @param {Object} queryString - req.query
   * @param {Object} options
   *   - allowedFilterFields: string[]  => whitelist for filter keys
   *   - searchFields: string[]         => fields to search in (regex)
   *   - arraySearchFields: string[]    => fields that are arrays (use $elemMatch)
   */
  constructor(mongooseQuery, queryString, options = {}) {
    this.mongooseQuery = mongooseQuery;
    this.queryString = queryString;

    this.allowedFilterFields = options.allowedFilterFields || null;
    this.searchFields = options.searchFields || [];
    this.arraySearchFields = options.arraySearchFields || [];
    this.page = 1;
    this.limit = 12;
  }

  /** Basic filtering + gte/gt/lte/lt + multi-value $in */
  filter() {
    const queryObj = { ...this.queryString };

    const excluded = ["page", "sort", "limit", "fields", "keyword"];
    excluded.forEach((el) => delete queryObj[el]);

    // turn gte, gt, lte, lt to $gte, $gt, $lte, $lt
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(
      /\b(gte|gt|lte|lt)\b/g,
      (match) => `$${match}`
    );

    let mongoFilter = {};
    try {
      mongoFilter = JSON.parse(queryStr);
    } catch (e) {
      mongoFilter = {};
    }

    // Whitelist allowed filter fields (important for security & stability)
    if (Array.isArray(this.allowedFilterFields)) {
      Object.keys(mongoFilter).forEach((key) => {
        if (!this.allowedFilterFields.includes(key)) {
          delete mongoFilter[key];
        }
      });
    }

    // Multi-value filters: ?brand=1,2,3  => { brand: { $in: ["1","2","3"] } }
    Object.keys(mongoFilter).forEach((key) => {
      const val = mongoFilter[key];
      if (typeof val === "string" && val.includes(",")) {
        mongoFilter[key] = { $in: val.split(",") };
      }
    });

    this.mongooseQuery = this.mongooseQuery.find(mongoFilter);
    this._currentFilter = mongoFilter; // useful for countDocuments
    return this;
  }

  /** Keyword search on multiple fields (regex-based fallback) */
search() {
  const keyword = this.queryString.keyword?.trim();
  if (!keyword || this.searchFields.length === 0) return this;

  const orConditions = [];

  for (const field of this.searchFields) {
    // Nested fields like "category.name"
    if (field.includes(".")) {
      orConditions.push({
        [field]: { $regex: keyword, $options: "i" }
      });
    }
    // Array fields like features[]
    else if (this.arraySearchFields.includes(field)) {
      orConditions.push({
        [field]: { $elemMatch: { $regex: keyword, $options: "i" } }
      });
    }
    // Normal text fields
    else {
      orConditions.push({
        [field]: { $regex: keyword, $options: "i" }
      });
    }
  }

  this.mongooseQuery = this.mongooseQuery.find({ $or: orConditions });
  return this;
}




  /** Sorting: ?sort=price,-createdAt */
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.mongooseQuery = this.mongooseQuery.sort(sortBy);
    } else {
      this.mongooseQuery = this.mongooseQuery.sort("-createdAt");
    }
    return this;
  }

  /** Limiting fields (projection): ?fields=name,price */
  limitFields() {
    if (this.queryString.fields) {
      const select = this.queryString.fields.split(",").join(" ");
      this.mongooseQuery = this.mongooseQuery.select(select);
    } else {
      this.mongooseQuery = this.mongooseQuery.select("-__v");
    }
    return this;
  }

  /** Pagination: ?page=2&limit=20 */
  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 12;
    const skip = (page - 1) * limit;

    this.page = page;
    this.limit = limit;

    this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);
    return this;
  }

  /**
   * Helper: build paginationResult object once you know total
   * @param {number} total
   */
  buildPaginationResult(total) {
    const pages = Math.ceil(total / this.limit) || 1;
    return {
      total,
      page: this.page,
      limit: this.limit,
      pages,
      hasNext: this.page < pages,
      hasPrev: this.page > 1,
    };
  }

  /** expose current filter to use in countDocuments */
  getFilter() {
    return this._currentFilter || {};
  }
}
