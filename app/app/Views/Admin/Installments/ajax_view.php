<?php
if (isset($view_data)) {
?>
    <div class="container mt-4">
        <table class="table table-bordered table-striped">
            <tbody>
                <!-- Full Name -->
                <tr>
                    <th>Name</th>
                    <td><?= htmlspecialchars($view_data['title']) ?></td>
                </tr>
                <!-- Fee Structure -->
                <tr>
                    <th>Fee Structure</th>
                    <td>
                        <?php
                        $feeStructure = json_decode($view_data['fee_structure'], true);
                        if (!empty($feeStructure)) {
                            echo "<ul>";
                            foreach ($feeStructure as $fee) {
                                echo "<li>" . htmlspecialchars($fee['name']) . ": ₹" . htmlspecialchars($fee['amount']) . "</li>";
                            }
                            echo "</ul>";
                        } else {
                            echo "No fee details available.";
                        }
                        ?>
                    </td>
                </tr>
                 <tr>
                    <th>Description</th>
                    <td><?= nl2br(htmlspecialchars($view_data['description'] ?? 'N/A')) ?></td>
                </tr>
                <!-- Point -->
                <tr>
                    <th>Point</th>
                    <td><?= nl2br(htmlspecialchars($view_data['point'] ?? 'N/A')) ?></td>
                </tr>
            </tbody>
        </table>
    </div>
<?php
}
?>
