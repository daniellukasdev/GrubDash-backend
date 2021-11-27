const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// ##################  Middleware Functions  ##################

/* checks that the order with the ID from params exists */
function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);

  /* if the params ID matched an ID in the orders array, 
  assigns order to request locals and goes to the next function */
  if (foundOrder) {
    res.locals.order = foundOrder;
    next();
  }
  /* passes error object to error handler if no match is found */
  next({
    status: 404,
    message: `Order id not found: ${req.params.orderId}`,
  });
}

/* invokes all necessary helper functions to make sure the order is valid */
function isValidOrder(req, res, next) {
  const { data } = req.body;
  if (!data)
    return next({
      status: 400,
      message: "Order must have 'data' key.",
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
  const invalidDishesError = invalidDishesCheck(data.dishes);
  if (invalidDishesError) return next(invalidDishesError);

  /* destructures the dishId from the request params. 
  if it exists, it invokes the helper function to check that 
  the ID and order status is valid and returns an error if 
  either is not valid. */
  const { orderId } = req.params;
  if (data.id) {
    const invalidIdError = validateOrderId(data.id, orderId);
    if (invalidIdError) return next(invalidIdError);

    const invalidStatusError = validateStatus(data.status);
    if (invalidStatusError) return next(invalidStatusError);
  }
  // invokes the next function if all validations are successful
  next();
}

/* checks that order status if pending and returns an error if it is not */
function verifyPendingStatus(req, res, next) {
  const foundOrder = res.locals.order;
  if (foundOrder.status !== "pending") {
    return next({
      status: 400,
      message: "An order cannot be deleted unless it is pending",
    });
  }
  // invokes the next function if all validations are successful
  next();
}

/* checks that the order status is not delivered and returns and 
returns error if it is. */
function checkIfDelivered(req, res, next) {
  const foundOrder = res.locals.order;
  if (foundOrder.status === "delivered") {
    return next({
      status: 400,
      message: "A delivered order cannot be changed",
    });
  }
  // invokes the next function if all validations are successful
  next();
}

// ##################  Helper Functions  ##################

/* function that takes in the data from the request body and checks 
that it has all the required fields and returns an error object if it 
does not */
function requiredFieldsCheck(data) {
  const requiredFields = ["deliverTo", "mobileNumber", "dishes"];
  for (const field of requiredFields) {
    if (!data[field] && field !== "dishes") {
      return {
        status: 400,
        message: `Order must include a ${field}`,
      };
    }
    /* if the dishes field does not exist, returns a different error */
    if (!data[field] && field === "dishes") {
      return {
        status: 400,
        message: `Order must include a dish`,
      };
    }
  }
}

/* checks that dish quantity is valid and returns error object if not */
function invalidDishQuantityCheck(dishes) {
  for (const dish in dishes) {
    if (
      !dishes[dish].quantity ||
      !Number.isInteger(dishes[dish].quantity) ||
      dishes[dish].quantity < 1
    ) {
      return {
        status: 400,
        message: `Dish ${dish} must have a quantity that is an integer greater than 0`,
      };
    }
  }
}

/* checks that dishes property is an array and not empty.
Returns error if not */
function invalidDishesCheck(dishes) {
  if (!Array.isArray(dishes) || dishes.length === 0) {
    return {
      status: 400,
      message: "Order must include at least one dish",
    };
  }
  return invalidDishQuantityCheck(dishes);
}

/* checks if the id property of the order matches the id from the url params */
function validateOrderId(id, orderId) {
  if (orderId !== id) {
    return {
      status: 400,
      message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`,
    };
  }
}

/* checks to order status to make sure it exists, is not empty, and is not invalid */
function validateStatus(status) {
  if (!status || status === "" || status === "invalid") {
    return {
      status: 400,
      message:
        "Order must have a status of pending, preparing, out-for-delivery, delivered",
    };
  }
}

// ##################  Request Functions  ##################

/*  */
function list(req, res) {
  res.json({ data: orders });
}

/*  */
function read(req, res) {
  res.json({ data: res.locals.order });
}

/*  */
function create(req, res) {
  const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;
  const newOrder = {
    id: nextId(),
    deliverTo,
    mobileNumber,
    dishes,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

/*  */
function update(req, res) {
  const foundOrder = res.locals.order;
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;

  const updatedOrder = {
    id: foundOrder.id,
    deliverTo,
    mobileNumber,
    status,
    dishes,
  };
  res.json({ data: updatedOrder });
}

/*  */
function destory(req, res) {
  const { orderId } = req.params;
  const index = orders.findIndex((order) => order.id === orderId);
  if (index > -1) {
    orders.splice(index, 1);
  }
  res.sendStatus(204);
}

module.exports = {
  list,
  create: [isValidOrder, create],
  update: [orderExists, isValidOrder, checkIfDelivered, update],
  read: [orderExists, read],
  delete: [orderExists, verifyPendingStatus, destory],
};
