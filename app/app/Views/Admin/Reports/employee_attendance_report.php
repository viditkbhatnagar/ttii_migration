<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<style id="table_style">
    .card_active{
        border:2px solid #405189!important;
    }
    
    table , td, th { width:100%; border: 1px solid #e9ebec; border-collapse: collapse;font-family: Arial, serif; }
    td, th { padding: 3px;width: 30px;height: 25px;}
    th { background: #eae9e9; }
    @page { size: landscape; }
    
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
    
    a{
        text-decoration: none !important;
        color:black;
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
                    <input type="month" class="form-control flatpickr-input date-input-custom"  value="<?= !empty($month) ? date('Y-m', strtotime($month)) : date('Y-m')?>" data-provider="flatpickr" data-altFormat="j, Y" onchange="attendance_by_month(this.value, <?=$user_id?>)">
                </div>
                <?php if(is_admin()) { ?>
                    <div class="col-6 text-end" style="margin-left: 24.5%">
                        <a href="<?=base_url('app/attendance_report/index/'.$month)?>" class="btn btn-md btn-outline-primary"><i class="ri-arrow-go-back-line"></i> Back</a>
                    </div>
                <?php } ?>
            </div>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-xxl-12">
        <div class="card" >
            <div class="card-body" >
                <div class="tab-content ">
                    <h4 class="fw-semibold ff-secondary m-4 text-primary" style="font-size:15px; text-align: center;"><u>ATTENDANCE OF - <?=strtoupper(date('F Y',strtotime($month)));?></u></h4>
                    <div class="mb-4" style="text-align: center;">
                        <a style="text-decoration: none !important" class="member-name" href="javascript:void(0);" onclick="canvas_right('<?=base_url('app/employees/ajax_view/'.$report['member']['id'])?>', 'Employee Details')">
                            <h6 class="mb-1"><?=strtoupper($report['member']['name'])?> (<span class="text-muted member-code mb-0"><?=$report['member']['employee_code']?></span>)</h6>
                        </a>
                    <!--    <h6>Total Present : <?=$report['attendance_array'][$report['member']['id']]['total_present']?></h6>-->
                    <!--    <h6>Total Absent : <?=$report['attendance_array'][$report['member']['id']]['total_absent']?></h6>-->
                    <!--    <h6>Desk Time : <?//=$report['attendance_array'][$report['member']['id']]['total_desktime']?></h6>-->
                    <!--    <h6>Time at work : <?//=$report['attendance_array'][$report['member']['id']]['total_time_at_work']?></h6>-->
                    <!--    <h6>Time Required : <?//=$report['attendance_array'][$report['member']['id']]['total_time_required']?></h6>-->
                    <!--    <h6>Shortage</h6>-->
                    <!--    <h6>Extra</h6>-->
                    </div>
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
                                  foreach($dayNames as $dayName) {
                                    echo "<div class='day_name'>$dayName</div>";
                                  }
                            
                                  // Fill in previous month's days
                                  for ($i = $previousMonthDays - $first_day + 1; $i <= $previousMonthDays; $i++) {
                                    echo "<div class='day_num ignore' >$i</div>";
                                  }
                                  
                                  // Display days of the current month
                                  for($day_counter = 1; $day_counter <= $days_in_month; $day_counter++) {
                                    $saturdayCount = 0; 
                                    $style="";
            			            $type_style = '';
                    			    $type ='';
                    			    $attendance = '';
                    			    $font = 'font-weight:normal';
                                    $currentDate = sprintf('%04d-%02d-%02d', $currentYear, $currentMonth, $day_counter);
                                    $weekday = strtoupper(date('D', strtotime($currentDate)));
                    		        if ($weekday == 'SAT') {
                    		            $saturdayCount++;
                    		        }
                                    if($currentDate <= date('Y-m-d')){
                                        
                                        $type =  $report['attendance_array'][$report['member']['id']][$currentDate]['type'];
                                        if($weekday == 'SUN' || ($weekday == 'SAT' && ($saturdayCount == 2 || $saturdayCount == 4)) || $report['attendance_array'][$report['member']['id']][$currentDate]['company_leave']==1) {
                    			            $style='color:#ff00006b; background-color:#fbe8e4';
                    			        } else if($report['attendance_array'][$report['member']['id']][$currentDate]['attendance'] =='P'){
                    			             $attendance = 'Present';
                			                 $style="color:green;";
                			            }else if($report['attendance_array'][$report['member']['id']][$currentDate]['attendance'] =='A'){
                			                $attendance = 'Absent';
                			                $style="color:red;";
                			                $type_style =  'style="color:#ff00006b"';
                			                if($report['attendance_array'][$report['member']['id']][$currentDate]['type']== 'Not Defined'){
                			                    $type_style =  'style="color:#ff00006b"';
                			                    $type = '';
                			                }else{
                			                    $type_style = 'style="color:red"';

                			                }
                			            }
                			        }
                			        
                                
        			                
                                    echo "<div class='day_num' style='$style'>";
                                    echo "<div>$day_counter</div>";
                                    echo "<div style='$font'>$attendance</div>";
                                    echo "<small $type_style>";
                                    echo "$type";
                                    echo "</small>";
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
 
<script>
    function attendance_by_month(month_year,user_id) {
        var base_url = '<?= base_url('app/employee_attendance_report/index/') ?>';
       var url = base_url + month_year + '?user_id=' + user_id;
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
    
    
    
    // Get the element you want to scroll horizontally
    const container = document.querySelector('#card_body');
    
    let isDragging = false;
    let startX;
    let scrollLeft;
    
    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });
    
    container.addEventListener('mouseleave', () => {
        isDragging = false;
    });
    
    container.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    container.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 2; // Adjust scrolling speed if needed
        container.scrollLeft = scrollLeft - walk;
    });

</script>

<script type="text/javascript">
    function printDiv() {
        var printWindow = window.open('', '', '');
        printWindow.document.write('<html><head><title>ATTENDANCE OF - <?=strtoupper(date('F Y',strtotime($month)));?></title>');
 
        //Print the Table CSS.
        var table_style = document.getElementById("table_style").innerHTML;
        printWindow.document.write('<style type = "text/css">');
        printWindow.document.write(table_style);
        printWindow.document.write('</style>');
        printWindow.document.write('</head>');
 
        //Print the DIV contents i.e. the HTML Table.
        printWindow.document.write('<body>');
        var divContents = document.getElementById("card_body").innerHTML;
        printWindow.document.write(divContents);
        printWindow.document.write('</body>');
 
        printWindow.document.write('</html>');
        printWindow.document.close();
        printWindow.print();
    }
    
    
    
    function exportToExcel(table) {
        <?php 
            $file_name = strtolower(str_replace(' ', '_', date('F Y',strtotime($month))));
        ?>
        // Create an XML Excel document
        var excelData = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
        excelData += '<head>';
        excelData += '<!--[if gte mso 9]>';
        excelData += '<xml>';
        excelData += '<x:ExcelWorkbook>';
        excelData += '<x:ExcelWorksheets>';
        excelData += '<x:ExcelWorksheet>';
        excelData += '<x:Name>Sheet1</x:Name>';
        excelData += '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>';
        excelData += '</x:ExcelWorksheet>';
        excelData += '</x:ExcelWorksheets>';
        excelData += '</x:ExcelWorkbook>';
        excelData += '</xml>';
        excelData += '<![endif]-->';
        excelData += '</head>';
        excelData += '<body>';
        excelData += '<table>' + table.innerHTML + '</table>'; // Include the table data
        excelData += '</body>';
        excelData += '</html>';
    
        // Create a Blob containing the Excel file data
        var blob = new Blob([excelData], { type: 'application/vnd.ms-excel' });
    
        // Create a download link and trigger the download
        var fileName = "<?=$file_name?>.xls"; // Use PHP variables for the file name
        if (navigator.msSaveBlob) { // For IE and Edge
            navigator.msSaveBlob(blob, fileName);
        } else {
            var downloadLink = document.createElement("a");
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = fileName;
            downloadLink.style.display = "none";
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    }


</script>