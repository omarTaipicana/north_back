const catchError = require("../utils/catchError");
const StaffUser = require("../models/StaffUser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const register = catchError(async (req, res) => {
  const { full_name, email, password, role } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ message: "Faltan datos: full_name, email, password" });
  }

  const exists = await StaffUser.findOne({ where: { email } });
  if (exists) return res.status(409).json({ message: "Ya existe un usuario con ese email" });

  const password_hash = await bcrypt.hash(password, 10);

  const user = await StaffUser.create({
    full_name,
    email,
    password_hash,
    role: role || "scanner",
    is_active: true,
  });

  return res.status(201).json({
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
  });
});

const login = catchError(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Faltan datos: email, password" });

  const user = await StaffUser.findOne({ where: { email } });
  if (!user) return res.status(401).json({ message: "Credenciales inválidas" });
  if (!user.is_active) return res.status(403).json({ message: "Usuario inactivo" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: "Credenciales inválidas" });

  // 🔑 Token con payload útil
  const token = jwt.sign(
    {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      },
    },
    process.env.TOKEN_SECRET,
    { expiresIn: "12h" }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    },
  });
});

const getMe = catchError(async (req, res) => {
  // req.user viene de verifyJWT
  const { id } = req.user;

  const user = await StaffUser.findByPk(id, {
    attributes: ["id", "full_name", "email", "role", "is_active"],
  });

  if (!user) return res.sendStatus(404);

  res.json(user);
});



module.exports = { register, login, getMe };
