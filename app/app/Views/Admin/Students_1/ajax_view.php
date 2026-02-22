<?php
if (isset($view_data)) {
    
    
    if ($view_data['status'] == 0) {
        $status = '<span class="badge badge1-danger   mb-2">Inactive</span>';
    } else {
        $status = '<span class="badge badge1-success   mb-2">Active</span>';
    }
    
    ?>
    <style>
        .badge-warning{
            background-color:yellow;
        }
        .badge-success{
            background-color:green;
        }
        .badge-danger{
            background-color:red;
        }
    </style>
    
    <table class="table table-nowrap table-striped-columns">
        <tbody>
            <tr>
                <th>Student ID</th>
                <td><?= isset($view_data['student_id']) ? 'UPC00'.$view_data['student_id'] : '' ?></td>
            </tr>
            <tr>
                <th>Student Name</th>
                <td><?= isset($view_data['name']) ? $view_data['name'] : '' ?></td>
            </tr>
            <tr>
                <th>Phone</th>
                <td><?= isset($view_data['phone']) ? $view_data['phone'] : '' ?></td>
            </tr>
            <tr>
                <th>Email</th>
                <td><?= isset($view_data['email']) ? $view_data['email'] : '' ?></td>
            </tr>
            
            <tr>
                <th>Date of Birth</th>
                <td><?= isset($view_data['dob']) ? $view_data['dob'] : '' ?></td>
            </tr>
            <tr>
                <th>Age</th>
                <td><?= isset($view_data['age']) ? $view_data['age'] : '' ?></td>
            </tr>
            <tr>
                <th>Gender</th>
                <td><?= isset($view_data['gender']) ? $view_data['gender'] : '' ?></td>
            </tr>
            <tr>
                <th>Address</th>
                <td><?= isset($view_data['address']) ? $view_data['address'] : '' ?></td>
            </tr>
            <tr>
                <th>Country</th>
                <td><?= isset($view_data['country']) ? $view_data['country'] : '' ?></td>
            </tr>
            <tr>
                <th>Whatsapp Number</th>
                <td><?= isset($view_data['address']) ? $view_data['whatsapp_no'] : '' ?></td>
            </tr>
            
             <tr>
                <th>Status</th>
                <td><?= $status ?></td>
            </tr>
            
        </tbody>
    </table>
<?php
}
?>
