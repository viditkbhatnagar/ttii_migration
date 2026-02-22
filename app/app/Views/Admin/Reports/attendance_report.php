<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<style id="table_style">
    .card_active{
        border:2px solid #405189!important;
    }
    
    table , td, th { width:100%; border: 1px solid #e9ebec; border-collapse: collapse;font-family: Arial, serif;text-align: center; }
    td, th { padding: 3px;width: 30px;height: 25px;text-align: center; }
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
                    <input type="month" class="form-control flatpickr-input date-input-custom"
                           value="<?= !empty($month) ? date('Y-m', strtotime($month)) : date('Y-m')?>"
                           data-provider="flatpickr" data-altFormat="j, Y" onchange="attendance_by_month(this.value, <?=!empty($team_id) ? $team_id : '' ?>)">
                </div>
            </div>
        </div>
    </div>
</div>
<div class="row pt-3">
    <div class="col-xl-3 col-md-5">
        <a href="<?=base_url('app/attendance_report/index/'.$month)?>">
            <div class="card card-animate <?=empty($team_id) ? 'card_active' : ''?>">
                <div class="card-body">
                    <div class="d-flex justify-content-between mt-0">
                        <div class="align-items-start">
                            <h4 class="fw-semibold ff-secondary mb-2 text-primary" style="font-size:15px;">ALL TEAM</h4>
                            <span class="text-muted" style="font-size:11px;">VIEW MEMBERS</span>
                        </div>
                        <div class="avatar-sm flex-shrink-0 align-items-end">
                            <span class="avatar-title bg-success-subtle rounded fs-4">
                                <!--<i class="bx bx-folder-open text-info"></i>--><span class="text-info"><?=$total_members?></span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </a>
    </div>
    
    <?php foreach($team_list as $team){ ?>
        <div class="col-xl-3 col-md-5">
            <a href="<?=base_url('app/attendance_report/index/'.$month.'/'.$team['id'])?>">
                <div class="card card-animate <?=$team_id == $team['id'] ? 'card_active' : ''?>">
                    <div class="card-body">
                        <div class="d-flex justify-content-between mt-0">
                            <div class="align-items-start">
                                <h4 class="fw-semibold ff-secondary mb-2 text-primary" style="font-size:15px;"><?=strtoupper($team['title'])?></h4>
                                <span class="text-muted" style="font-size:11px;">VIEW MEMBERS</span>
                            </div>
                            <div class="avatar-sm flex-shrink-0 align-items-end">
                                <span class="avatar-title bg-success-subtle rounded fs-4">
                                    <!--<i class="bx bx-folder-open text-info"></i>--><span class="text-info"><?=$team['member_count']?></span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </a>
        </div>
    <?php } ?>
</div>

<div class="row">
    <div class="col-xxl-12">
        <div class="card p-3">
            <div class="row">
                <div class="col-lg-6">
                    <div class="gap-2 d-print-none mt-4 ml-4" style="float: left;">
                        <div class="d-flex" style="margin-left:17px">
                            <button class="btn btn-success" type="button" value="Print" onclick="printDiv()">
                                <span class="fa fa-print"></span> Print
                            </button> 
                            
                            <button class="btn btn-success" style="margin-left:4px" type="button" value="Excel" onclick="exportToExcel(document.getElementById('excel_table'))">
                                <span class="fa fa-file-excel-o"></span> Excel
                            </button>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6 text-end">
                    <a href="<?=base_url('app/reports/all')?>" class="btn btn-md btn-outline-primary" style="margin-top:28px;"><i class="ri-arrow-go-back-line"></i> Back</a>
                </div>
            </div>
            <div class="card-body" id="card_body" style="max-width: 100%; overflow-x: auto;">
                
                <div class="tab-content">
                    <div class="tab-pane active" id="nav-border-justified-employees" role="tabpanel">
                        <div class="pt-2">
                            <table class="display table table-bordered" id="excel_table" style="overflow-y:scroll!important; width:100%">
                            	<tbody>
                            		<tr style="text-align:center">
                            			<th colspan="<?=count($report['date_array'])+9?>" ><h4 class="fw-semibold ff-secondary mb-2 text-primary" style="font-size:15px;">ATTENDANCE OF - <?=strtoupper(date('F Y',strtotime($month)));?></h4></th>
                            		</tr>
                            		
                            		<tr>
                            		    <th>Employees</th>
                            		    <?php 
                                		    $saturdayCount = 0; 
                                		    foreach($report['date_array'] as $date) { 
                                		        $weekday = strtoupper($date['weekday']);
                                		        if ($weekday == 'SAT') {
                                		            $saturdayCount++;
                                		        }
                                		 ?>
                            			    <td <?php if ($weekday == 'SUN' || ($weekday == 'SAT' && ($saturdayCount == 2 || $saturdayCount == 4)))  echo "style='color:red; background-color:#fbe8e4'" ?>><b><i><?=date('d',strtotime($date['date']))?></b><br><small><?=strtoupper($date['weekday'])?></small></i></td>
                            			<?php } ?>
                            			<th>Total Present</th>
                            			<th>Total Absent</th>
                            			<th>Desk Time</th>
                            			<th>Time at work</th>
                            			<th>Time Required</th>
                            			<th>Shortage</th>
                            			<th>Extra</th>
                            			<th></th>
                            		</tr>
                            		<?php 
                        		        foreach($report['members'] as $member){
                		            ?>
                		                <tr>
                		                    <td>
                                                <div class="team-content col-md-12 m-2">
                                                    <a style="text-decoration: none !important" class="member-name" href="javascript:void(0);" onclick="canvas_right('<?=base_url('app/employees/ajax_view/'.$member['id'])?>', 'Employee Details')">
                                                        <h6 class="mb-1"><?=$member['name']?></h6>
                                                        <p class="text-muted member-code mb-0"><?=$member['employee_code']?></p>
                                                        <p class="text-muted member-designation mb-0"><?= !empty($designation[$member['user_designation_id']]) ? ($designation[$member['user_designation_id']] ?? '') : ''?></p>
                                                    </a>
                                                </div>
                		                    </td>
                            			    <?php 
                            			        $total_present = 0;
                            			        $total_absent = 0;
                            			        foreach($report['date_array'] as $date) { 
                            			          if($date['date'] <= date('Y-m-d')){
                            			              if($report['attendance_array'][$member['id']][$date['date']]['attendance'] =='P'){
                            			                 $style="color:green;";
                            			              }else if($report['attendance_array'][$member['id']][$date['date']]['attendance'] =='A'){
                            			                 $style="color:red;";
                            			              }else{
                            			                 $style="background-color:#fbe8e4;";
                            			              }
                            			          }else{
                            			              $style="";
                            			          }
                            			    ?>
                                			    <td style="<?=$style?>">
                                			        <?php if($report['attendance_array'][$member['id']][$date['date']]['attendance']=='P') { ?>
                                			            <b>
                                			        <?php } ?>
                                			            <?=$report['attendance_array'][$member['id']][$date['date']]['attendance']?>
                                			        <?php if($report['attendance_array'][$member['id']][$date['date']]['attendance']=='P') { ?>
                                			            </b>
                                			        <?php } ?>
                                			        <?php if(isset($report['attendance_array'][$member['id']][$date['date']]['type']) && $report['attendance_array'][$member['id']][$date['date']]['type']!= 'Not Defined' && $report['attendance_array'][$member['id']][$date['date']]['attendance']=='A'){ ?>
                                			           <hr>
                                			           <?php
                                			                if($report['attendance_array'][$member['id']][$date['date']]['type']== 'Not Defined'){
                                			                    $type_style =  'style="color:#ff00006b"';
                                			                }else{
                                			                    $type_style =  'style="color:grey"';
                                			                }
                                			           ?>
                                			           <small <?=$type_style?>><?=$report['attendance_array'][$member['id']][$date['date']]['type']?></small>
                                			       <?php } ?>
                                			    </td>
                            			    <?php } ?>
                            			    <td><?=$report['attendance_array'][$member['id']]['total_present']?></td>
                            			    <td><?=$report['attendance_array'][$member['id']]['total_absent']?></td>
                            			    <td><?=$member['total_desktime']?></td>
                            			    <td><?=$member['total_time_at_work']?></td>
                            			    <td><?//=$member['total_time_required']?></td>
                            			    <td></td>
                            			    <td></td>
                            			    <td>
                            			        <a href="<?=base_url('app/employee_attendance_report/index/'. $month . '?user_id='. $member['id'])?>" class="btn btn-md btn-outline-primary" style="margin-top:28px;">View</a>
                            			    </td>
                		                </tr>
                		            <?php
                        		        }
                        		    ?>
                            		
                            	</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div><!-- end card-body -->
        </div>
    </div><!--end col-->
</div> 

<script>
    function attendance_by_month(month_year,team_id) {
        var base_url = '<?= base_url('app/attendance_report/index/') ?>';
        // Check if team_id is empty
        if (!team_id) {
            team_id = ''; // Or set it to any default value you want
        }

        var url = base_url + month_year + '/' + team_id;
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