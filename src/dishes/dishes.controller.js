const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// ##################  Middleware Functions  ##################

/* checks that the dish with the ID from params exists */
function dishExists(req, res, next) {
  const { dishId } = req.params;
  const foundDish = dishes.find((dish) => dish.id === dishId);

  /* if the params ID matched an ID in the dishes array, 
  assigns order to request locals and goes to the next function */
  if (foundDish) {
    res.locals.dish = foundDish;
    next();
  }
  /* passes error object to error handler if no match is found */
  next({
    status: 404,
    message: `Dish id not found: ${req.params.dishId}`,
  });
}
/* invokes all necessary helper functions to make sure the dish is valid */
function isValidDish(req, res, next) {
  /* gets data object from request body */
  const { data } = req.body;
  /* checks to make sure data exists and returns error if it does not */
  if (!data)
    return next({
      status: 400,
      message: "Dish must have 'data' key.",
    });

  /* declares variable to store error object if the helper 
  function returns an error object. If the error is returned,
  the error object is passed to the error handler */
  const invalidFieldsError = requiredFieldsCheck(data);
  if (invalidFieldsError) {
    return next(invalidFieldsError);
  }

  /* declares variable to store error object if the helper 
  function returns an error object. If the error is returned,
  the error object is passed to the error handler */
  const invalidPriceError = invalidPriceCheck(data.price);
  if (invalidPriceError) {
    return next(invalidPriceError);
  }

  /* destructures the dishId from the request params. 
  if it exists, it invokes the helper function to check that 
  the ID is valid and returns an error if it is not. */
  const { dishId } = req.params;
  if (data.id) {
    const invalidIdError = validateDishId(data.id, dishId);
    if (invalidIdError) return next(invalidIdError);
  }
  // invokes the next function if all validations are successful
  next();
}

// ##################  Helper Functions  ##################

/* function that takes in the data from the request body and checks 
that it has all the required fields and returns an error object if it 
does not */
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

/* takes in the price and checks if it is a number and not less than 1
returns an error object of not valid */
function invalidPriceCheck(price) {
  if (typeof price !== "number" || price < 1) {
    return {
      status: 400,
      message: "Dish must have a price that is an integer greater than 0",
    };
  }
}

/* checks if the id property of the dish matches the id from the url params */
function validateDishId(id, dishId) {
  if (dishId !== id) {
    return {
      status: 400,
      message: `Dish id does not match route id. Dish: ${id}, Route: ${dishId}`,
    };
  }
}

// ##################  Request Functions  ##################

/* returns entire dishes array */
function list(req, res) {
  res.json({ data: dishes });
}

/* returns dish from response locals */
function read(req, res) {
  res.json({ data: res.locals.dish });
}

/* creates a new dish object */
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

/* updates an existing dish object */
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
