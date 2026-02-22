<?php
    if (isset($view_data)){
        ?>
        <table class="table table-nowrap table-striped-columns">
            <tbody>
                <tr>
                    <th>Title</th>
                    <td><?=$view_data['title']?></td>
                </tr>
                <tr>
                    <th>Date</th>
                    <td><?= !empty($view_data['created_at']) ? DateTime::createFromFormat('Y-m-d H:i:s', $view_data['created_at'])->format('d-m-Y g:i A') : '';?></td>
                </tr>
            </tbody>
        </table>
        <?php
    }
?>
