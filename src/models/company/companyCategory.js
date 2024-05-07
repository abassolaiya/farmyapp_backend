import mongoose from 'mongoose';

const companyCategorySchema = mongoose.Schema({
    userId: {
        type : String,
        required : true
    },
    name:{
        type: String
    },
    slug: {
        type: String
    }
},
{
    timestamps: true,
}
)

const CompanyCategory = mongoose.model('CompanyCategory', companyCategorySchema);

export default CompanyCategory;