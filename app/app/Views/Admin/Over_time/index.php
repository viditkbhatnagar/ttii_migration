<style>
    .calendar {
        display: flex;
        flex-flow: column;
    }
    .calendar .header .month-year {
        font-size: 20px;
        font-weight: bold;
        color: #636e73;
        padding: 20px 0;
    }
    .calendar .days {
        display: flex;
        flex-flow: wrap;
    }
    .calendar .days .day_name {
        width: calc(100% / 7);
        padding: 20px;
        font-size: 14px;
        font-weight: bold;
        
    }
    .calendar .days .day_name:nth-child(7) {
        border: none;
    }
    .calendar .days .day_num {
        display: flex;
        flex-flow: column;
        width: calc(100% / 7);
        border-right: 1px solid #e6e9ea;
        border-bottom: 1px solid #e6e9ea;
        padding: 15px;
        font-weight: bold;
        color: #7c878d;
        cursor: pointer;
        min-height: 100px;
    }
    .calendar .days .day_num span {
        display: inline-flex;
        width: 30px;
        font-size: 14px;
    }
    .calendar .days .day_num .event {
        margin-top: 10px;
        font-size: 10px;
        padding: 3px 6px;
        border-radius: 4px;
        background-color: #f7c30d;
        color: #fff;
        word-wrap: break-word;
    }
    .calendar .days .day_num .event.green {
        background-color: #51ce57;
    }
    .calendar .days .day_num .event.blue {
        background-color: #518fce;
    }
    .calendar .days .day_num .event.red {
        background-color: #ce5151;
    }
    .calendar .days .day_num:nth-child(7n+1) {
        border-left: 1px solid #e6e9ea;
    }
    .calendar .days .day_num:hover {
        background-color: #fdfdfd;
    }
    .calendar .days .day_num.ignore {
        background-color: #fdfdfd;
        color: #ced2d4;
        cursor: inherit;
    }
    .calendar .days .day_num.selected {
        background-color: #f1f2f3;
        cursor: inherit;
    }
    .month-year {
        margin-bottom: 15px;
        font-size: 15px;
        font-weight: 600;
        color: #000;
        text-align: center;
    }
    .indication div {
        display: inline-block;
        width: 15px;
        height: 15px;
        margin-right:10px
    }
    .calendar .days .day_num .event.gray {
        background: #ccc;
    }
    .greens {
        background: #51ce57;
    }
    .grays{background: gray;}
    .reds {
        background: #ce5151;
    }
    
    .yellows {
        background: #f7c30d;
    }
    @media (max-width: 767.98px){
        .calendar .days .day_name,.calendar .days .day_num,.calendar .days .day_num .event{
        padding: 0px;
        }
        .calendar .days .day_num .event{font-size:8px;}
    }
</style>

<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('app/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>

        </div>
    </div>
</div>
<!-- end page title -->

<div class="row">
    <div class="col-xxl-12">
        <div class="mb-2">
            <div class="row">
                <div class="col-3">
                    <input type="month" class="form-control flatpickr-input date-input-custom"
                           value="<?= !empty($month) ? date('Y-m', strtotime($month)) : date('Y-m')?>"
                           data-provider="flatpickr" data-altFormat="j, Y" onchange="over_time_calendar_by_month(this.value)">
                </div>
                <div class="col-5 text-center">
                    <div class="btn-group mt-auto" role="group" aria-label="Basic example">
                    </div>
                </div>
                <div class="col-4 text-end">
                    <?php
                        if (!is_employee()){
                            ?>
                            <div class="btn" aria-label="Basic example">
                                <button type="button" class="btn btn-success" onclick="show_ajax_modal('<?=base_url('app/over_time/ajax_add/')?>', 'Create <?=$page_title ?? ''?>')"><i class="ri-add-fill me-1 align-bottom"></i> Add Over Time</button>
                            </div>
                            <?php
                        }
                    ?>
                </div>
            </div>
        </div>
    </div>
</div>
<div class="row">
    <div class="col-xxl-12">
        <div class="card" >
            <div class="card-body" >
                <div class="tab-content ">
                    <div class="tab-pane active" id="nav-border-justified-employees" role="tabpanel">
                        <div class="pt-2">
                            
                        <?php
                          $currentMonth = date('n', strtotime($month));
                          $currentYear = date('Y', strtotime($month));
                          $days_in_month = cal_days_in_month(CAL_GREGORIAN, $currentMonth, $currentYear);
                          $first_day = date('w', strtotime("$currentYear-$currentMonth-01"));
                          $day_counter = 1;
                        
                          // Calculate previous month's days
                          $previousMonth = ($currentMonth == 1) ? 12 : $currentMonth - 1;
                          $previousYear = ($currentMonth == 1) ? $currentYear - 1 : $currentYear;
                          $previousMonthDays = cal_days_in_month(CAL_GREGORIAN, $previousMonth, $previousYear);
                        
                          // Calculate next month's days
                          $nextMonth = ($currentMonth == 12) ? 1 : $currentMonth + 1;
                          $nextYear = ($currentMonth == 12) ? $currentYear + 1 : $currentYear;
                        
                          // Calculate the number of days from the next month needed to fill the grid
                          $remainingDays = 35 - ($first_day + $days_in_month);
                        ?>

                        <div class="calendar">
                           
                           
                              <div class="days">
                               <?php
                              // Display day names
                              $dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                              foreach ($dayNames as $dayName) {
                                echo "<div class='day_name'>$dayName</div>";
                              }
                        
                              // Fill in previous month's days
                              for ($i = $previousMonthDays - $first_day + 1; $i <= $previousMonthDays; $i++) {
                                echo "<div class='day_num ignore' >$i</div>";
                              }
                              
                              // Display days of the current month
                              for ($day_counter = 1; $day_counter <= $days_in_month; $day_counter++) {
                                $currentDate = sprintf('%04d-%02d-%02d', $currentYear, $currentMonth, $day_counter);
                                $over_time_exist = false;
                                foreach($over_time_data as $over_time) {
                                    if ($over_time['date'] == $currentDate) {
                                        $over_time_exist = true;
                                        break;
                                    }
                                }
                                 
                                $addButton = $over_time_exist ? "" :  "<a id='addBtn' type='button' class='btn btn-outline-primary btn-sm plus-btn' onclick=\"show_ajax_modal('" . base_url('app/over_time/ajax_add/'.$currentDate) . "', 'Create " . ($page_title ?? '') . "')\"><i class='ri-add-fill'></i></a>";
                                echo "<div class='day_num' onclick=\"show_ajax_modal('" . ($over_time_exist ? base_url('app/over_time/ajax_view/'.$currentDate) : base_url('app/over_time/ajax_add/'.$currentDate)) . "', '" . ($over_time_exist ? 'View ' : 'Create ') . ($page_title ?? '') . "')\">";
                                echo "<div>$day_counter </div>";
                                echo "$addButton";
                                foreach($over_time_data as $over_time) {
                                    if ($over_time['date'] == $currentDate) {
                                        if($over_time['is_approved'] == 2){
                                            $style = "style='color:green !important;font-size:12px; font-weight: 300;'";
                                        }else if($over_time['is_approved'] == 0){
                                            $style = "style='color:red !important;font-size:12px; font-weight: 300;'";
                                        }else if($over_time['is_approved'] == 1){
                                            $style = "style='color:blue !important;font-size:12px; font-weight: 300;'";
                                        }
                                        $date = date('g:i A', strtotime($over_time['start_time'])).  ' - ' .date('g:i A', strtotime($over_time['end_time']));
                                        echo "<a type='button' onclick=\"show_ajax_modal('" . base_url('app/over_time/ajax_view/'.$currentDate) . "', 'View " . ($page_title ?? '') . "')\"><small class='li-item' $style>$date <br></small></a>";
                                    }
                                }
                                echo "</div>";
                              }
                        
                              // Fill in next month's days
                              for ($nextMonthDayCounter = 1; $nextMonthDayCounter <= $remainingDays; $nextMonthDayCounter++) { 
                                echo "<div class='day_num ignore'>$nextMonthDayCounter</div>";
                              }
                            ?>
                              </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div><!-- end card-body -->
        </div>
    </div><!--end col-->
</div>

<style>
    .card_active{
        border:2px solid #405189!important;
    }
    
    #addBtn{
        --vz-btn-padding-x: 0.9rem!important;
        --vz-btn-padding-y: 0.5rem!important;
        --vz-btn-font-size: 0.8125rem!important;
        --vz-btn-font-weight: 0!important;
        --vz-btn-line-height: 0.5px!important;
        width: 44px!important;
        margin: auto;
        /*margin-left: 72%;*/
        /*margin-top: -8%;*/
    }   
     
</style>


<script>
    function over_time_calendar_by_month(month_year) {
        var base_url = '<?= base_url('app/over_time/index/') ?>';
        var url = base_url + month_year;
        $.ajax({
            type: 'POST',
            url: url,
            success: function(response) {
                // Handle success
                // Redirect to the new URL
                window.location.href = url;
            },
            error: function(xhr, status, error) {
                // Handle error
            }
        })
    }
</script>
