<?php
    if (isset($view_data)){
        ?>
        <table class="table table-nowrap table-striped-columns">
            <tbody>
                <tr>
                    <th>Team Name</th>
                    <td><?=$view_data['title']?></td>
                </tr>
                <tr>
                    <th>Description</th>
                    <td><?=$view_data['description']?></td>

                </tr>
            </tbody>
        </table>
        <?php
    }
?>
