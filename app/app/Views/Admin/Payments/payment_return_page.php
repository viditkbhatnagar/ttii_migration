    <style>
        table {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
        }

        th {
            font-size: 12px;
            background: #54b254;
            color: #FFFFFF;
            font-weight: bold;
            height: 30px;
        }

        td {
            font-size: 12px;
            background: #dff3e0;
        }

        .error {
            color: #FF0000;
            font-weight: bold;
        }
    </style>
    <table width="90%" cellpadding="2" cellspacing="2" border="0" align="center">
        <tr>
            <th colspan="2">
                <h1>Omniware Payment API Integration Test Kit</h1>
                <table width="100%" cellpadding="2" cellspacing="2" border="0">
                    <tr>
                        <td colspan="2" align="center">
                            <h3>NOTE: It is very important to calculate the hash using the returned value and compare it against the hash that was sent with payment request, to make sure the response is legitimate.</h3>
                        </td>
                    </tr>
                    <tr>
                        <th colspan="2">Response from Omniware</th>
                    </tr>
                    <?php foreach($response as $key => $value): ?>
                    <tr>
                        <td width="25%"><?= htmlspecialchars($key) ?></td>
                        <td><?= htmlspecialchars($value) ?></td>
                    </tr>
                    <?php endforeach; ?>
                </table>
            </th>
        </tr>
    </table>
