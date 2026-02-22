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
                    <th>Created At</th>
                    <td><?= DateTime::createFromFormat('Y-m-d H:i:s', $view_data['created_at'])->format('d-m-Y g:i A')?></td>
                </tr>
                <tr>
                    <th>Updated At</th>
                    <td><?= DateTime::createFromFormat('Y-m-d H:i:s', $view_data['updated_at'])->format('d-m-Y g:i A')?></td>
                </tr>
            </tbody>
        </table>
        <?php
    }
?>
