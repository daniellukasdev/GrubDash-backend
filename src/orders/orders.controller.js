const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass

function list(req, res) {
  res.json({ data: orders });
}

function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);

  if (foundOrder) {
    res.locals.order = foundOrder;
    next();
  }
  next({
    status: 404,
    message: `Order id not found: ${req.params.orderId}`,
  });
}

function read(req, res) {
  res.json({ data: res.locals.order });
}

function requiredFieldsCheck(data) {
  const requiredFields = ["deliverTo", "mobileNumber", "dishes"];
  for (const field of requiredFields) {
    if (!data[field] && field !== "dishes") {
      return {
        status: 400,
        message: `Order must include a ${field}`,
      };
    }
    if (!data[field] && field === "dishes") {
      return {
        status: 400,
        message: `Order must include a dish`,
      };
    }
  }
}

function invalidDishQuantityCheck(dishes) {
  for (const dish in dishes) {
    if (
      !dishes[dish].quantity ||
      !Number.isInteger(dishes[dish].quantity) ||
      dishes[dish].quantity <= 0
    ) {
      return {
        status: 400,
        message: `Dish ${dish} must have a quantity that is an integer greater than 0`,
      };
    }
  }
}

function invalidDishesCheck(dishes) {
  if (!Array.isArray(dishes) || dishes.length === 0) {
    return {
      status: 400,
      messages: "Order must include at least one dish",
    };
  }
  return invalidDishQuantityCheck(dishes);
}

function validateOrderId(id, orderId) {
  if (orderId !== id) {
    return {
      status: 400,
      message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`,
    };
  }
}

function validateStatus(status) {
  if (!status || status === "" || status === "invalid") {
    return {
      status: 400,
      message:
        "Order must have a status of pending, preparing, out-for-delivery, delivered",
    };
  }
}

function isValidOrder(req, res, next) {
  const { data } = req.body;
  if (!data)
    return next({
      status: 400,
      message: "Order must have 'data' key.",
    });

  const invalidFieldsError = requiredFieldsCheck(data);
  if (invalidFieldsError) {
    return next(invalidFieldsError);
  }

  const invalidDishesError = invalidDishesCheck(data.dishes);
  if (invalidDishesError) return next(invalidDishesError);

  const { orderId } = req.params;
  if (data.id) {
    const invalidIdError = validateOrderId(data.id, orderId);
    if (invalidIdError) return next(invalidIdError);

    const invalidStatusError = validateStatus(data.status);
    if (invalidStatusError) return next(invalidStatusError);
  }

  next();
}

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

function checkIfDelivered(req, res, next) {
  const foundOrder = res.locals.order;
  if (foundOrder.status === "delivered") {
    return next({
      status: 400,
      message: "A delivered order cannot be changed",
    });
  }
  next();
}

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

function verifyPendingStatus(req, res, next) {
  const foundOrder = res.locals.order;
  if (foundOrder.status !== "pending") {
    return next({
      status: 400,
      message: "An order cannot be deleted unless it is pending",
    });
  }
  
  next();
}

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
