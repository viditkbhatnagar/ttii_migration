<?php
if (isset($view_data)){
    ?>
    <table class="table table-nowrap table-striped-columns">
        <tbody>
            
            <tr>
                <th>Counsellor Name</th>
                <td><?=$view_data['counsellor_name']?></td>
            </tr> 
             <tr>
                <th>Status</th>
                <td><?= $view_data['type'] == '1' ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-danger">Inactive</span>' ?></td>
            </tr>
            
            <tr>
                <th>Point/Application</th>
                <td><?=$view_data['value']?></td>
            </tr>
            <tr>
                <th>From Date</th>
                <td><?=$view_data['from_date']?></td>
            </tr>
            <tr>
                <th>To Date</th>
                <td><?=$view_data['to_date']?></td>
            </tr>
           
        </tbody>
    </table>
    <?php
}
?>
