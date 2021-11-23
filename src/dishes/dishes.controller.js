const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /dishes handlers needed to make the tests pass

function list(req, res) {
  res.json({ data: dishes });
}

function dishExists(req, res, next) {
  const { dishId } = req.params;
  const foundDish = dishes.find((dish) => dish.id === dishId);

  if (foundDish) {
    res.locals.dish = foundDish;
    next();
  }
  next({
    status: 404,
    message: `Dish id not found: ${req.params.dishId}`,
  });
}

function read(req, res) {
  res.json({ data: res.locals.dish });
}

// function hasDataProperty(req, res, next) {
//   const { data } = req.body;
//   if (!data)
//     return next({
//       status: 400,
//       message: "Dish must have 'data' key.",
//     });
//   next();
// }

function requiredFieldsCheck(data) {
  const requiredFields = ["name", "description", "price", "image_url"];
  for (const field of requiredFields) {
    if (!data[field]) {
      return {
        status: 400,
        message: `Dish must include a ${field}`,
      };
    }
  }
}

function invalidPriceCheck(price) {
  if (typeof price !== "number" || price < 1) {
    return {
      status: 400,
      message: "Dish must have a price that is an integer greater than 0",
    };
  }
}

function validateDishId(id, dishId) {
  if (dishId !== id) {
    return {
      status: 400,
      message: `Dish id does not match route id. Dish: ${id}, Route: ${dishId}`,
    };
  }
}

function isValidDish(req, res, next) {
  const { data } = req.body;
  if (!data)
    return next({
      status: 400,
      message: "Dish must have 'data' key.",
    });

  const invalidFieldsError = requiredFieldsCheck(data);
  if (invalidFieldsError) {
    return next(invalidFieldsError);
  }

  const invalidPriceError = invalidPriceCheck(data.price);
  if (invalidPriceError) {
    return next(invalidPriceError);
  }
  const { dishId } = req.params;
  if (data.id) {
    const invalidIdError = validateDishId(data.id, dishId);
    if (invalidIdError) return next(invalidIdError);
  }
  next();
}

function create(req, res) {
  const { data: { name, description, price, image_url } = {} } = req.body;

  const newDish = {
    id: nextId(),
    name,
    description,
    price,
    image_url,
  };

  dishes.push(newDish);
  res.status(201).json({ data: newDish });
}

function update(req, res) {
  const foundDish = res.locals.dish;
  const { data: { name, description, price, image_url } = {} } = req.body;

  const updatedDish = {
    id: foundDish.id,
    name,
    description,
    price,
    image_url,
  };
  res.json({ data: updatedDish });
}

module.exports = {
  list,
  create: [isValidDish, create],
  update: [dishExists, isValidDish, update],
  read: [dishExists, read],
};
