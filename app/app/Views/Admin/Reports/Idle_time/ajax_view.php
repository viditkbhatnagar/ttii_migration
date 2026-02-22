<div class="row">
    <div class="col-md-12">
        <h5 class="card-title">Name: <?=$user_data['name']?></h5>
        <p class="card-text">Employee Code: <?=$user_data['employee_code']?></p>
        <hr>
        <div class="card-subtitle mb-2 text-muted">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <span class="font-weight-bold">Reports of </span><?=date('d-M-Y', strtotime($from_date)).' - '.date('d-M-Y', strtotime($to_date))?>
                </div>
            </div>
        </div>
        <table class="data_table_basic table table-bordered nowrap table-striped align-middle">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Duration</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach($view_data as $data){ 
                    $seconds = $data['duration'];
                    $hours = floor($seconds / 3600);
                    $minutes = floor(($seconds % 3600) / 60);
                    $formattedTime = sprintf("%02d:%02d", $hours, $minutes);
                    
                    list($hours, $minutes) = explode(':', $formattedTime);
                    
                    $start_date = date('d-m-Y', strtotime($data['start_time']));
                    $end_date = date('d-m-Y', strtotime($data['end_time'])) ?? '';
                    $start_time = date('h:i A', strtotime($data['start_time']));
                    $end_time = date('h:i A', strtotime($data['end_time']));
                ?>
                    <tr>
                        <td>
                            <?php 
                                if($start_date == $end_date || $data['end_time'] == ''){ 
                                    echo $start_date;
                                } else { 
                                    echo $start_date . ' - ' . $end_date;
                                } 
                            ?>
                        </td>
                        <td><?=$start_time?></td>
                        <td><?=$end_time?></td>
                        <td><?=$hours?> h <?=$minutes?> min</td>
                    </tr>
                <?php } ?>
            </tbody>
        </table>
    </div>
</div>