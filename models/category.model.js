import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true , "Name is required"],
        trim: true,
        maxlength: [50 , "Name must be less than 50 characters"],
        minlength: [3 , "Name must be at least 3 characters"],
    },
    slug: {
        type: String,
        required: [true , "Slug is required"],
        trim: true,
        lowercase: true,
        unique: true,
    },
    image: {
        type: String,
        required: [true , "Image is required"],
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

categorySchema.post("save", function (doc) {
    setImageUrl(doc);
});
categorySchema.post("init", function (doc) {
    setImageUrl(doc);
});

const Category = mongoose.model("Category", categorySchema);

export default Category;
