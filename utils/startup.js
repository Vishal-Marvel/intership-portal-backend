const Role = require("../models/roleModel");
const AppError = require("./appError");
const Staff = require("../models/staffModel");
const fs = require('fs');
const File = require("../models/fileModel");
exports.performStartUp = async function () {
// Create the user
    try {

        const admin = new Role({
            role_name: "admin"
        });
        await admin.save();

        const internshipcoordinator = new Role({
            role_name: "internshipcoordinator"
        });
        await internshipcoordinator.save();

        const mentor = new Role({
            role_name: "mentor"
        });
        await mentor.save();

        const principal = new Role({
            role_name: "principal"
        });
        await principal.save();


        const tap_cell = new Role({
            role_name: "tapcell"
        });
        await tap_cell.save();

        const hod = new Role({
            role_name: "hod"
        });
        await hod.save();

        const ceo = new Role({
            role_name: "ceo"
        });
        await ceo.save();


    } catch (e) {
        if (e.code === "ER_DUP_ENTRY") {

        } else {
            console.error(e.message);
        }
    }
   
    // Path to the file on the server
    const filePath = 'public/images/default.png';
    const fileBuffer = fs.readFileSync(filePath);
    if (!fileBuffer){
        console.error("Error in Reading File");
        process.exit(0)
    }
    const chkFile = await File.where({file_name:"default_profile_photo"}).fetch()
        .catch((err) =>{
            if (err.message === "EmptyResponse"){}
        })
    if(!chkFile){
        const file = new File({
            file_name: "default_profile_photo",
            file: fileBuffer
        })
        await file.save();
        console.log("profile Photo saved");
    }

    try {
        const role = await Role.where({role_name: "admin"}).fetch();
        const chkFile = await File.where({file_name:"default_profile_photo"}).fetch()
        const admin = new Staff({
            name: "admin",
            email: "admin@sairam.edu.in",
            password: "admin23",
            profile_photo: chkFile.get("id")
        });
        await admin.save();
        await admin.roles().attach(role);

    } catch (e) {
        if (e.code === "ER_DUP_ENTRY") {
        } else {
            console.error(e.message);
        }
    }

    console.log('Startup tasks completed');
}
