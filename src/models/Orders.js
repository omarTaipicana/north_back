const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const Orders = sequelize.define("orders", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  buyer_name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },

  buyer_email: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: { isEmail: true },
  },

  buyer_phone: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },

  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },

  status: {
    type: DataTypes.ENUM("pending_payment", "paid_validated", "cancelled"),
    allowNull: false,
    defaultValue: "pending_payment",
  },
});

module.exports = Orders;
