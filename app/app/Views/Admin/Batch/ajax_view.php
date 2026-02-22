<?php
    if (isset($view_data)){
       
        
                                $fromdate = new \DateTime($view_data['start_date']);
                                $todate = new \DateTime($view_data['end_date']);
                                // // Format the date
                                $from = $fromdate->format('M d, Y');
                                $to = $todate->format('M d, Y');
        ?>
        <table class="table table-nowrap table-striped-columns">
            <tbody>
                <tr>
                    <th>Course</th>
                    <td><?=$course[$view_data['course_id']]?></td>
                </tr>
                <tr>
                    <th>Start Date</th>
                    <td><?=$from?></td>
                </tr>
                <tr>
                    <th>End Date</th>
                    <td><?=$to?></td>
                </tr>
                <tr>
                    <th>Title</th>
                    <td><?=$view_data['title']?></td>
                </tr>
                <tr>
                    <th>Created On</th>
                    <td><?= !empty($view_data['created_at']) ? DateTime::createFromFormat('Y-m-d H:i:s', $view_data['created_at'])->format('d-m-Y g:i A') : '';?></td>
                </tr>
            </tbody>
        </table>
        <?php
    }
?>
