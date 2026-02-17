const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const Events = sequelize.define("events", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },

  venue: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  artists: {
    type: DataTypes.TEXT, // texto libre: "Artista1 / Artista2 ..."
    allowNull: true,
  },

  starts_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },

  checkin_opens_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  checkin_closes_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = Events;
