const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const Contactanos = sequelize.define("contactanos", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  nombres: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },

  email: {
    type: DataTypes.STRING(160),
    allowNull: false,
    validate: { isEmail: true },
  },

  telefono: {
    type: DataTypes.STRING(40),
    allowNull: true,
  },

  asunto: {
    type: DataTypes.STRING(180),
    allowNull: true,
  },

  mensaje: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },

  read_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  ip: {
    type: DataTypes.STRING(60),
    allowNull: true,
  },

  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
});

module.exports = Contactanos;
