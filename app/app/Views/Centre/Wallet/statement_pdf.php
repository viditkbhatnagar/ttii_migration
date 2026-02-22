<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Wallet Statement</title>

    <style>
        body { font-family: sans-serif; font-size: 12px; }
        h2 { margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ccc; padding: 6px; font-size: 11px; }
        th { background: #f0f0f0; font-weight: bold; }
        .right { text-align: right; }
    </style>
</head>
<body>

<h2>Wallet Statement</h2>
<p>Centre ID: <?= $centreId ?></p>
<p>Generated at: <?= date('d-m-Y H:i') ?></p>

<table>
    <thead>
        <tr>
            <th>Date</th>
            <th>Transaction ID</th>
            <th>Type</th>
            <th>Description</th>
            <th class="right">Amount</th>
            <th class="right">Balance After</th>
        </tr>
    </thead>

    <tbody>
        <?php foreach ($rows as $r): ?>
        <tr>
            <td><?= esc($r['date']) ?></td>
            <td><?= esc($r['transaction_id']) ?></td>
            <td><?= esc($r['type']) ?></td>
            <td><?= esc($r['description']) ?></td>
            <td class="right"><?= esc($r['amount']) ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
</table>

</body>
</html>
