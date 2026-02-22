<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Form Submission</title>
</head>
<body>
    <form action="https://pgbiz.omniware.in/v2/paymentrequest" id="payment_form" method="POST">
        <input type="hidden" name="hash" value="<?= $hash ?>" />
        <input type="hidden" name="api_key" value="<?= $api_key ?>" />
        <input type="hidden" name="return_url" value="<?= $return_url ?>" />
        <input type="hidden" name="mode" value="<?= $mode ?>" />
        <input type="hidden" name="order_id" value="<?= $order_id ?>" />
        <input type="hidden" name="amount" value="<?= $amount ?>" />
        <input type="hidden" name="currency" value="<?= $currency ?>" />
        <input type="hidden" name="description" value="<?= $description ?>" />
        <input type="hidden" name="name" value="<?= $name ?>" />
        <input type="hidden" name="email" value="<?= $email ?>" />
        <input type="hidden" name="phone" value="<?= $phone ?>" />
        <input type="hidden" name="address_line_1" value="<?= $address_line_1 ?>" />
        <input type="hidden" name="address_line_2" value="<?= $address_line_2 ?>" />
        <input type="hidden" name="city" value="<?= $city ?>" />
        <input type="hidden" name="state" value="<?= $state ?>" />
        <input type="hidden" name="zip_code" value="<?= $zip_code ?>" />
        <input type="hidden" name="country" value="<?= $country ?>" />
        <input type="hidden" name="udf1" value="<?= $udf1 ?>" />
        <input type="hidden" name="udf2" value="<?= $udf2 ?>" />
        <input type="hidden" name="udf3" value="<?= $udf3 ?>" />
        <input type="hidden" name="udf4" value="<?= $udf4 ?>" />
        <input type="hidden" name="udf5" value="<?= $udf5 ?>" />
        <noscript><input type="submit" value="Continue"/></noscript>
    </form>
    <script>
        document.getElementById('payment_form').submit();
    </script>
</body>
</html>
