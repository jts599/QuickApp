# Code Style Guidelines

## Documentation Standards

All code must adhere to enterprise-grade documentation standards. Documentation is not optional—it is a critical component of maintainable, professional code.

## Function Documentation Requirements

### Mandatory Documentation

**Every function, method, class, and module MUST include comprehensive documentation that includes:**

1. **Overall Description**: A clear, concise explanation of what the function does, its purpose, and its role in the system
2. **Parameters**: Complete documentation for every parameter including:
   - Name
   - Type
   - Description of purpose
   - Valid values or constraints
   - Default values (if applicable)
   - Whether it's required or optional
3. **Return Values**: Full documentation of what the function returns including:
   - Return type
   - Description of the returned value
   - Possible return states or conditions
4. **Exceptions/Errors**: Document all exceptions or errors that may be thrown
5. **Side Effects**: Any modifications to state, database operations, file operations, or external API calls
6. **Examples**: Usage examples for complex functions

### Documentation Format by Language

#### JavaScript/TypeScript (JSDoc)

```javascript
/**
 * Calculates the total price of items in a shopping cart including tax and discounts.
 * 
 * This function iterates through all cart items, applies any available discounts,
 * calculates applicable taxes based on the user's location, and returns the final
 * total amount to be charged.
 * 
 * @param {Array<Object>} cartItems - Array of items in the shopping cart
 * @param {string} cartItems[].id - Unique identifier for the cart item
 * @param {number} cartItems[].price - Base price of the item
 * @param {number} cartItems[].quantity - Quantity of the item
 * @param {string} userLocation - User's location code for tax calculation (e.g., 'US-CA', 'UK-LON')
 * @param {Object} [discountCodes] - Optional discount codes to apply
 * @param {string} discountCodes.code - The discount code string
 * @param {number} discountCodes.percentage - Discount percentage (0-100)
 * 
 * @returns {Object} Calculation result object
 * @returns {number} returns.subtotal - Total before tax and discounts
 * @returns {number} returns.discount - Total discount amount applied
 * @returns {number} returns.tax - Tax amount calculated
 * @returns {number} returns.total - Final total amount
 * 
 * @throws {ValidationError} If cartItems is empty or invalid
 * @throws {LocationError} If userLocation is not supported
 * 
 * @example
 * const result = calculateCartTotal(
 *   [{id: '123', price: 29.99, quantity: 2}],
 *   'US-NY',
 *   {code: 'SAVE10', percentage: 10}
 * );
 * console.log(result.total); // 48.59
 */
function calculateCartTotal(cartItems, userLocation, discountCodes) {
  // Implementation
}
```

#### Python (Docstrings)

```python
def calculate_cart_total(cart_items, user_location, discount_codes=None):
    """
    Calculates the total price of items in a shopping cart including tax and discounts.
    
    This function iterates through all cart items, applies any available discounts,
    calculates applicable taxes based on the user's location, and returns the final
    total amount to be charged.
    
    Args:
        cart_items (list[dict]): Array of items in the shopping cart. Each item must contain:
            - id (str): Unique identifier for the cart item
            - price (float): Base price of the item
            - quantity (int): Quantity of the item
        user_location (str): User's location code for tax calculation (e.g., 'US-CA', 'UK-LON')
        discount_codes (dict, optional): Discount codes to apply. Contains:
            - code (str): The discount code string
            - percentage (float): Discount percentage (0-100)
            Defaults to None.
    
    Returns:
        dict: Calculation result containing:
            - subtotal (float): Total before tax and discounts
            - discount (float): Total discount amount applied
            - tax (float): Tax amount calculated
            - total (float): Final total amount
    
    Raises:
        ValidationError: If cart_items is empty or contains invalid data
        LocationError: If user_location is not supported
    
    Examples:
        >>> result = calculate_cart_total(
        ...     [{'id': '123', 'price': 29.99, 'quantity': 2}],
        ...     'US-NY',
        ...     {'code': 'SAVE10', 'percentage': 10}
        ... )
        >>> print(result['total'])
        48.59
    
    Side Effects:
        - Logs calculation details to the audit log
        - Updates discount code usage counter in database
    """
    # Implementation
    pass
```

## Class and Module Documentation

### Classes

All classes must include:
- Purpose and responsibility of the class
- Key properties and their meanings
- Relationship to other classes
- Usage examples
- Thread-safety considerations (if applicable)

### Modules/Files

All modules/files should have a header comment that includes:
- Module purpose and scope
- Key exports
- Dependencies
- Author/maintainer (if applicable)
- Version history for significant changes

## Additional Standards

### Inline Comments

- Use inline comments to explain **why**, not **what**
- Complex algorithms should have step-by-step explanations
- Business logic should reference requirements or specifications

### Code Clarity

- Self-documenting code is good, but documentation is still required
- Function names should be descriptive but documentation provides context
- Avoid abbreviations unless universally understood

### TODO/FIXME Comments

- Include context, priority, and date
- Format: `// TODO(name, YYYY-MM-DD): Description`

## Clean Code Standards

### Function Size and Independence

**Every function must be small, focused, and independent.**

#### Key Principles

1. **Single Responsibility Principle (SRP)**: Each function should do one thing and do it well
2. **Function Length**: Aim for functions under 20 lines; absolutely no more than 50 lines
3. **Independence**: Functions should be self-contained with minimal dependencies
4. **Reusability**: Write functions that can be easily tested and reused in different contexts
5. **Abstraction Levels**: Keep operations at the same level of abstraction within a function

#### Example: Breaking Down Complex Functions

**❌ BAD - Large, complex function:**

```javascript
function processOrder(order) {
  // Validate order
  if (!order.items || order.items.length === 0) {
    throw new Error('Order has no items');
  }
  if (!order.customerId) {
    throw new Error('Order has no customer');
  }
  
  // Calculate totals
  let subtotal = 0;
  for (let item of order.items) {
    subtotal += item.price * item.quantity;
  }
  
  // Apply discounts
  let discount = 0;
  if (order.discountCode) {
    const discountData = lookupDiscount(order.discountCode);
    if (discountData && discountData.isValid) {
      discount = subtotal * (discountData.percentage / 100);
    }
  }
  
  // Calculate tax
  const taxRate = getTaxRate(order.shippingAddress.state);
  const tax = (subtotal - discount) * taxRate;
  
  // Create invoice
  const total = subtotal - discount + tax;
  const invoice = {
    orderId: order.id,
    customerId: order.customerId,
    subtotal,
    discount,
    tax,
    total,
    date: new Date()
  };
  
  // Save to database
  saveInvoice(invoice);
  
  // Send notifications
  sendOrderConfirmation(order.customerId, invoice);
  if (order.isGift) {
    sendGiftNotification(order.giftRecipient, invoice);
  }
  
  return invoice;
}
```

**✅ GOOD - Small, focused functions:**

```javascript
/**
 * Processes an order by validating, calculating totals, and creating an invoice.
 * 
 * @param {Object} order - The order to process
 * @returns {Object} The created invoice
 * @throws {ValidationError} If order validation fails
 */
function processOrder(order) {
  validateOrder(order);
  const pricing = calculateOrderPricing(order);
  const invoice = createInvoice(order, pricing);
  saveInvoice(invoice);
  sendOrderNotifications(order, invoice);
  return invoice;
}

/**
 * Validates that an order has all required fields.
 * 
 * @param {Object} order - The order to validate
 * @throws {ValidationError} If validation fails
 */
function validateOrder(order) {
  if (!order.items || order.items.length === 0) {
    throw new ValidationError('Order has no items');
  }
  if (!order.customerId) {
    throw new ValidationError('Order has no customer');
  }
}

/**
 * Calculates subtotal, discount, tax, and total for an order.
 * 
 * @param {Object} order - The order to calculate pricing for
 * @returns {Object} Pricing breakdown with subtotal, discount, tax, and total
 */
function calculateOrderPricing(order) {
  const subtotal = calculateSubtotal(order.items);
  const discount = calculateDiscount(subtotal, order.discountCode);
  const tax = calculateTax(subtotal - discount, order.shippingAddress);
  const total = subtotal - discount + tax;
  
  return { subtotal, discount, tax, total };
}

/**
 * Calculates the subtotal of order items.
 * 
 * @param {Array<Object>} items - Array of order items
 * @returns {number} The subtotal amount
 */
function calculateSubtotal(items) {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

/**
 * Calculates discount amount based on discount code.
 * 
 * @param {number} subtotal - The order subtotal
 * @param {string} discountCode - Optional discount code
 * @returns {number} The discount amount (0 if no valid discount)
 */
function calculateDiscount(subtotal, discountCode) {
  if (!discountCode) return 0;
  
  const discountData = lookupDiscount(discountCode);
  if (!discountData || !discountData.isValid) return 0;
  
  return subtotal * (discountData.percentage / 100);
}

/**
 * Calculates tax based on shipping address.
 * 
 * @param {number} taxableAmount - The amount to calculate tax on
 * @param {Object} shippingAddress - The shipping address
 * @returns {number} The tax amount
 */
function calculateTax(taxableAmount, shippingAddress) {
  const taxRate = getTaxRate(shippingAddress.state);
  return taxableAmount * taxRate;
}

/**
 * Creates an invoice from order and pricing data.
 * 
 * @param {Object} order - The order
 * @param {Object} pricing - The pricing breakdown
 * @returns {Object} The created invoice
 */
function createInvoice(order, pricing) {
  return {
    orderId: order.id,
    customerId: order.customerId,
    ...pricing,
    date: new Date()
  };
}

/**
 * Sends all necessary notifications for an order.
 * 
 * @param {Object} order - The order
 * @param {Object} invoice - The invoice
 */
function sendOrderNotifications(order, invoice) {
  sendOrderConfirmation(order.customerId, invoice);
  
  if (order.isGift) {
    sendGiftNotification(order.giftRecipient, invoice);
  }
}
```

### Cyclomatic Complexity (CC) Minimization

**Cyclomatic Complexity measures the number of independent paths through code. Lower complexity means more maintainable, testable code.**

#### Complexity Targets

- **Target CC: 1-5** (Simple, easy to test)
- **Acceptable CC: 6-10** (Moderate complexity, refactor if possible)
- **Unacceptable CC: 11+** (Must be refactored)

#### Reducing Cyclomatic Complexity

**Techniques:**

1. **Extract conditional logic into separate functions**
2. **Use early returns to reduce nesting**
3. **Replace complex conditionals with polymorphism or strategy pattern**
4. **Use lookup tables/maps instead of long if-else chains**
5. **Apply guard clauses**

#### Example: Reducing Complexity

**❌ BAD - High cyclomatic complexity (CC = 12):**

```javascript
function getUserAccessLevel(user, resource) {
  if (user) {
    if (user.isActive) {
      if (user.role === 'admin') {
        return 'full';
      } else if (user.role === 'manager') {
        if (resource.department === user.department) {
          return 'write';
        } else {
          return 'read';
        }
      } else if (user.role === 'user') {
        if (resource.ownerId === user.id) {
          return 'write';
        } else if (resource.isPublic) {
          return 'read';
        } else {
          return 'none';
        }
      } else {
        return 'none';
      }
    } else {
      return 'none';
    }
  } else {
    return 'none';
  }
}
```

**✅ GOOD - Low cyclomatic complexity (CC = 2 per function):**

```javascript
/**
 * Determines the access level a user has for a resource.
 * 
 * @param {Object} user - The user requesting access
 * @param {Object} resource - The resource being accessed
 * @returns {string} Access level: 'none', 'read', 'write', or 'full'
 */
function getUserAccessLevel(user, resource) {
  if (!user || !user.isActive) {
    return 'none';
  }
  
  return getAccessLevelByRole(user, resource);
}

/**
 * Determines access level based on user role.
 * 
 * @param {Object} user - The active user
 * @param {Object} resource - The resource being accessed
 * @returns {string} Access level
 */
function getAccessLevelByRole(user, resource) {
  const accessHandlers = {
    admin: () => 'full',
    manager: () => getManagerAccess(user, resource),
    user: () => getUserAccess(user, resource)
  };
  
  const handler = accessHandlers[user.role];
  return handler ? handler() : 'none';
}

/**
 * Determines access level for manager role.
 * 
 * @param {Object} user - The manager user
 * @param {Object} resource - The resource being accessed
 * @returns {string} Access level
 */
function getManagerAccess(user, resource) {
  return resource.department === user.department ? 'write' : 'read';
}

/**
 * Determines access level for regular user role.
 * 
 * @param {Object} user - The regular user
 * @param {Object} resource - The resource being accessed
 * @returns {string} Access level
 */
function getUserAccess(user, resource) {
  if (resource.ownerId === user.id) {
    return 'write';
  }
  return resource.isPublic ? 'read' : 'none';
}
```

#### Guard Clauses

Use early returns to reduce nesting and complexity:

**❌ BAD:**

```javascript
function processPayment(payment) {
  if (payment.amount > 0) {
    if (payment.method === 'credit_card') {
      if (payment.cardNumber) {
        // Process payment
        return chargeCard(payment);
      }
    }
  }
  return null;
}
```

**✅ GOOD:**

```javascript
function processPayment(payment) {
  if (payment.amount <= 0) return null;
  if (payment.method !== 'credit_card') return null;
  if (!payment.cardNumber) return null;
  
  return chargeCard(payment);
}
```

### Additional Clean Code Principles

#### Avoid Deep Nesting

- Maximum nesting depth: 3 levels
- Use early returns, extraction, or inversion of logic

#### No Magic Numbers or Strings

```javascript
// ❌ BAD
if (user.status === 1) { }

// ✅ GOOD
const USER_STATUS_ACTIVE = 1;
if (user.status === USER_STATUS_ACTIVE) { }
```

#### DRY (Don't Repeat Yourself)

- If code appears more than twice, extract it to a function
- Eliminate duplicate logic through abstraction

#### Immutability Preferred

- Prefer `const` over `let`
- Avoid mutating parameters
- Use pure functions when possible

## Enforcement

All code MUST meet these standards before being committed:

- **Documentation**: Complete documentation for all functions, parameters, and return values
- **Function Size**: Functions should be under 20 lines (max 50 lines)
- **Cyclomatic Complexity**: Target CC of 1-5, maximum CC of 10
- **Single Responsibility**: Each function does one thing only

Code that does not meet these standards will not pass review.