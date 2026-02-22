<!-- Start page title -->
<div class="row mb-3">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item">
                        <a href="<?=base_url('admin/dashboard/index')?>">Dashboard</a>
                    </li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>
        </div>
    </div>
</div>

<!-- Form Card -->
<div class="row">
    <div class="col-lg-12">
        <div class="card">
            <form action="<?=base_url('admin/exam/add')?>" enctype="multipart/form-data" method="post" id="centreAddform">
                <div class="card-body">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label for="title" class="form-label">Title<span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="title" name="title" required>
                        </div>
                        
                        <div class="col-md-6">
                            <label for="mark" class="form-label">Mark<span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="mark" name="mark" required>
                        </div>
                        
                        <div class="col-md-6">
                            <label for="course_id" class="form-label">Course<span class="required text-danger">*</span></label>
                            <select class="form-control select2" name="course_id" id="course_id" required >
                                <option value="0">Select Course</option>
                                <?php foreach($course as $val){ ?>
                                <option value="<?=$val['id']?>"><?=$val['title']?></option>
                                <?php } ?>
                            </select>
                        </div>
                        
                        <div class="col-md-6">
                            <label for="batch_id" class="form-label">Batch<span class="required text-danger">*</span></label>
                            <select class="form-control select2" name="batch_id" id="batch_id" required >
                                <option value="0">Select Batch</option>
                                <?php foreach($batch as $val){ ?>
                                <option value="<?=$val['id']?>"><?=$val['title']?></option>
                                <?php } ?>
                            </select>
                        </div>
                        
                        
                        <div class="col-md-6">
                            <label for="start_date" class="form-label">Start Date<span class="required text-danger">*</span></label>
                            <input type="date" class="form-control" id="start_date" name="from_date" required>
                        </div>
                        
                        <div class="col-md-6">
                            <label for="end_date" class="form-label">End Date<span class="required text-danger">*</span></label>
                            <input type="date" class="form-control" id="end_date" name="to_date" required>
                        </div>
                        
                        <div class="col-md-4">
                            <label for="start_date" class="form-label">Start Time<span class="required text-danger">*</span></label>
                            <input type="time" class="form-control" id="from_time" name="from_time" required>
                        </div>
                        
                        <div class="col-md-4">
                            <label for="end_date" class="form-label">End Time<span class="required text-danger">*</span></label>
                            <input type="time" class="form-control" id="to_time" name="to_time" required>
                        </div>
                        
                        
                        <div class="col-md-4">
                            <label for="duration" class="form-label">Duration<span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="duration" name="duration" required>
                        </div>
                        
                        <div class="col-12 p-2 form-group">
                            <label for="title" class="form-label">Instructions</label>
                            <textarea class="form-textarea editor" name="description" id="editor1"></textarea>
                        </div>
                        
               
                        
                        <div class="col-lg-6 p-2">
                            <div class="mt-3">
                                <div>
                                    <div class="form-check pb-3">
                                        <input class="form-check-input" type="checkbox" value="1" name="free" id="defaultIndeterminateCheck2">
                                        <label class="form-check-label" for="defaultIndeterminateCheck2">Is Free?</label>
                                    </div> 
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-12 p-2">
                            <button class="btn btn-success float-end btn-save" type="submit">
                                <i class="ri-check-fill"></i> Save
                            </button>
                        </div>
                        
                        
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script>
    $(document).ready(function() {

        $('#from_time, #to_time').on('input', function() {
            calculateDuration();
        });

        function calculateDuration() {
            const startTime = $('#from_time').val();
            const endTime = $('#to_time').val();

            if (startTime && endTime) {
                // Split the time into hours and minutes
                const [startHours, startMinutes] = startTime.split(':').map(Number);
                const [endHours, endMinutes] = endTime.split(':').map(Number);

                // Convert time to minutes
                const startTotalMinutes = startHours * 60 + startMinutes;
                const endTotalMinutes = endHours * 60 + endMinutes;

                let diff = endTotalMinutes - startTotalMinutes;

                // Handle overnight scenarios
                if (diff < 0) {
                    diff += 24 * 60;
                }

                const hours = Math.floor(diff / 60).toString().padStart(2, '0');
                const minutes = (diff % 60).toString().padStart(2, '0');

                $('#duration').val(`${hours}:${minutes}`);
            }
        }
    });
    
     $(document).ready(function() {
        // Initialize CKEditor
        ClassicEditor
            .create( document.querySelector( '#editor1' ) )
            .catch( error => {
                console.error( error );
            });

    });
</script>




