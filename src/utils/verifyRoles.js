const verifyRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user?.role) return res.sendStatus(401);

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "No tienes permisos para esta acción" });
    }

    next();
  };
};

module.exports = verifyRoles;
