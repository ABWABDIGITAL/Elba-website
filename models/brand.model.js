import mongoose from "mongoose";

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true , "Name is required"],
        trim: true,
        maxlength: [50 , "Name must be less than 50 characters"],
        minlength: [3 , "Name must be at least 3 characters"],
        unique: true,
        index: true,
    },
    slug: {
        type: String,
        required: [true , "Slug is required"],
        trim: true,
        lowercase: true,
        unique: true,
        index: true,
    },
    image: {
        type: String,
    },
}, {
    timestamps: true,
    versionKey: false 
});

const setImageUrl = (doc) => {
    if (doc.image) {
        const imageUrl = `${process.env.BASE_URL}/${doc.image}`;
        doc.image = imageUrl;
    }
};

brandSchema.post("save", function (doc) {
    setImageUrl(doc);
});
brandSchema.post("init", function (doc) {
    setImageUrl(doc);
});

const Brand = mongoose.model("Brand", brandSchema);

export default Brand;
