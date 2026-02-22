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
                    <th>Created On</th>
                    <td><?= DateTime::createFromFormat('Y-m-d H:i:s', $view_data['created_on'])->format('d-m-Y g:i A')?></td>
                </tr>
                <tr>
                    <th>Updated On</th>
                    <td><?= DateTime::createFromFormat('Y-m-d H:i:s', $view_data['updated_on'])->format('d-m-Y g:i A')?></td>
                </tr>
            </tbody>
        </table>
        <?php
    }
?>
