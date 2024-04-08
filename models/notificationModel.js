const bookshelf = require("../connection");
const Staff = require("./staffModel");
const { v4: uuidv4 } = require("uuid");

const Notification = bookshelf.model("Notification", {
  tableName: "notification",
  initialize: function () {
    this.on("creating", this.setId);
  },

  setId: async function () {
    const uuid = uuidv4(null, null, null);
    this.set("id", uuid.toString());
    this.set("created_at", new Date());
    this.set("updated_at", new Date());
  },
  faculty() {
    return this.belongsTo(Staff, "staff_id");
  },
});

Notification.findByIdAndUpdate = async function (id, updatedData) {
  try {
    const notification = await Notification.where({ id }).fetch();
    if (!notification) {
      throw new Error("Notification not found");
    }
    await notification.save(updatedData);
    return notification;
  } catch (err) {
    throw err;
  }
};

module.exports = Notification;
