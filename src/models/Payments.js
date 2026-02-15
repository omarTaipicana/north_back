const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const Payments = sequelize.define("payments", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  bank_name: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },

  deposit_id: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },

  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },

  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: "USD",
  },

  proof_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  is_validated: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },

  validated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  validated_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
});

module.exports = Payments;
