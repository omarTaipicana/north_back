const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const StaffUser = sequelize.define("staff_users", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  full_name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },

  email: {
    type: DataTypes.STRING(200),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },

  password_hash: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  role: {
    type: DataTypes.ENUM("admin", "validator", "scanner"),
    allowNull: false,
    defaultValue: "scanner",
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
});

module.exports = StaffUser;
