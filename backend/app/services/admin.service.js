const db = require("../models");
const Admin = db.admin;

exports.updateProfile = async (id, data, file) => {
    let updateData = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        age: data.age,
        gender: data.gender,
    };

    // Remove undefined values to prevent overwriting with null unintentionally
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    if (file) {
        updateData.avatar = `/static/images/avatars/${file.filename}`;
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedAdmin) {
        throw { status: 404, message: "Không tìm thấy Admin" };
    }

    // Need to return a payload shape that authMethod expects so frontend JSON.parse is exact
    return {
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        first_name: updatedAdmin.first_name,
        last_name: updatedAdmin.last_name,
        phone: updatedAdmin.phone,
        age: updatedAdmin.age,
        gender: updatedAdmin.gender,
        avatar: updatedAdmin.avatar,
        role: updatedAdmin.role,
    };
};
