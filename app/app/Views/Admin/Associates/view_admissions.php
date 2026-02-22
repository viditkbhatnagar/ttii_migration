<?php
if (isset($view_data)) {
    if ($view_data['student_status'] == 0) {
        $status = '<span class="badge badge1-danger   mb-2">Dropped</span>';
    } else if($view_data['student_status'] == 2) {
        $status = '<span class="badge badge1-success   mb-2">Graduated</span>';
    } else if($view_data['student_status'] == 3) {
        $status = '<span class="badge badge1-warning   mb-2">Enrolled</span>';
    } else {
        $status = '<span class="badge badge1-info   mb-2">Applied</span>';
    }
    ?>
    <table class="table table-nowrap table-striped-columns">
        <tbody>
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
                <th>Enrollment ID</th>
                <td><?= isset($view_data['enrollment_id']) ? $view_data['enrollment_id'] : '' ?></td>
            </tr>
            <tr>
                <th>Date of Birth</th>
                <td><?= isset($view_data['dob']) ? $view_data['dob'] : '' ?></td>
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
                <th>University</th>
                <td>
                    <?php foreach($universities as $key=>$university){
                      if($key == $view_data['university_id'])  {
                          echo $university;
                      }
                    }
                     ?>
                </td>
            </tr>
            <tr>
                <th>Consultant ID</th>
                <td>
                    <?php foreach($consultants as $key=>$consultant){
                      if($key == $view_data['consultant_id'])  {
                          echo $consultant;
                      }
                    }
                     ?>
                </td>
            </tr>
            <tr>
                <th>Fee</th>
                <td><?= isset($view_data['fee']) ? 'RS '.$view_data['fee'] : '' ?></td>
            </tr>
            <tr>
                <th>Academic Summaries</th>
                <td><?= isset($view_data['academic_summaries']) ? $view_data['academic_summaries'] : '' ?></td>
            </tr>
            <tr>
                <th>Student Status</th>
                <td><?= isset($view_data['student_status']) ? $status : '' ?></td>
            </tr>
        </tbody>
    </table>
    <?php
}
?>
