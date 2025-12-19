<?php 
// Secure checkout ID validation and sanitization
$checkoutid = $_GET['checkoutid'] ?? '';

// Validate checkout ID format (alphanumeric, dots, dashes, underscores only)
if (empty($checkoutid) || !preg_match('/^[a-zA-Z0-9._-]+$/', $checkoutid)) {
    http_response_code(400);
    die('<!DOCTYPE html>
    <html>
    <head><title>Error</title></head>
    <body>
        <h1>Invalid Checkout Session</h1>
        <p>The checkout ID is missing or invalid. Please return to the merchant site and try again.</p>
    </body>
    </html>');
}

// Sanitize for output
$checkoutid = htmlspecialchars($checkoutid, ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>HyperPay Checkout</title>

    <!-- HyperPay payment widget -->
    <script src="https://test.oppwa.com/v1/paymentWidgets.js?checkoutId=<?php echo $checkoutid; ?>"></script>

    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 40px;
        }
    </style>
</head>
<body> 

<form action="RESULT_URL_HERE" class="paymentWidgets" data-brands="MADA VISA MASTER AMEX  APPLEPAY GOOGLEPAY"></form>

</body>
</html>