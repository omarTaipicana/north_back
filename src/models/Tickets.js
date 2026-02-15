const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const Tickets = sequelize.define("tickets", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  code: {
    type: DataTypes.STRING(120),
    allowNull: false,
    unique: true,
  },

  status: {
    type: DataTypes.ENUM("unused", "used", "void"),
    allowNull: false,
    defaultValue: "unused",
  },

  used_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  used_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },

  gate: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
});

module.exports = Tickets;
