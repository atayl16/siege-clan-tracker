// Replace the existing routes section with:
const authRouter = require("./routes/auth");
const membersRouter = require("./routes/members");
const siegeRouter = require("./routes/siege");

app.use("/api/auth", authRouter);
app.use("/api/members", membersRouter);
app.use("/api/siege", siegeRouter);
