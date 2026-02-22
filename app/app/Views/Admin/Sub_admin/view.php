<?php
    if (isset($view_data)){
        ?>
        <table class="table table-nowrap table-striped-columns">
            <tbody>
                <tr>
                    <th>Name</th>
                    <td><?=$view_data['name']?></td>
                </tr>
                <tr>
                    <th>Phone</th>
                    <td><?=$view_data['phone']?></td>
                </tr>
                <tr>
                    <th>Email</th>
                    <td><?=$view_data['email']?></td>
                </tr>
            </tbody>
        </table>
        <?php
    }
?>
