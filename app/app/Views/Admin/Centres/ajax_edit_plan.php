<form id="assignPlanForm" action="<?= base_url('admin/centres/edit_assign_plan') ?>" method="post">
    
    <input type="hidden" name="centre_id" value="<?= $centre_id ?>">

    <div class="row">

        <!-- Course Dropdown -->
        <div class="col-lg-6 p-2">
            <div>
                <label class="form-label">Select Course <span class="text-danger">*</span></label>
                <select class="form-control select2" name="course_id" id="course_id" required>
                    <option value="">-- Select Course --</option>
                    <?php foreach ($course_data as $course): ?>
                        <option 
                            value="<?= $course['id'] ?>" 
                            data-price="<?= $course['sale_price'] ?>"
                            <?= $course['id'] == $plan_data['course_id'] ? 'selected' : '' ?>
                        >
                            <?= $course['title'] ?> (₹<?= $course['sale_price'] ?>)
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
        </div>

        <!-- Assigned Amount -->
        <div class="col-lg-6 p-2">
            <div>
                <label class="form-label">Assigned Amount <span class="text-danger">*</span></label>
                <input type="number" class="form-control" name="assigned_amount" id="assigned_amount" required value="<?= $plan_data['assigned_amount'] ?>">
            </div>
        </div>

        <!-- Start Date -->
        <div class="col-lg-6 p-2">
            <div>
                <label class="form-label">Start Date <span class="text-danger">*</span></label>
                <input type="date" class="form-control" name="start_date" required value="<?= $plan_data['start_date'] ?>">
            </div>
        </div>

        <!-- End Date -->
        <div class="col-lg-6 p-2">
            <div>
                <label class="form-label">End Date <span class="text-danger">*</span></label>
                <input type="date" class="form-control" name="end_date" required value="<?= $plan_data['end_date'] ?>">
            </div>
        </div>

        <!-- Submit -->
        <div class="col-12 p-2">
            <button type="submit" class="btn btn-success float-end">
                <i class="ri-check-fill"></i> Save Plan
            </button>
        </div>

    </div>

</form>

<script>
    // Auto fill assigned amount from selected course
    $('#course_id').change(function(){
        let amount = $('option:selected', this).data('price');
        $('#assigned_amount').val(amount ? amount : '');
    });

    // AJAX Submit
    // $('#assignPlanForm').submit(function(e){
    //     e.preventDefault();

    //     let formData = new FormData(this);

    //     $.ajax({
    //         url: $(this).attr('action'),
    //         type: "POST",
    //         data: formData,
    //         dataType: "json",
    //         contentType: false,
    //         processData: false,
    //         beforeSend:function(){
    //             $('.btn-success').attr('disabled', true).text('Saving...');
    //         },
    //         success:function(res){
    //             if(res.status == true){
    //                 $('#ajax_modal').modal('hide');
    //                 location.reload();
    //             }else{
    //                 toastr.error(res.message);
    //             }
    //         },
    //         complete:function(){
    //             $('.btn-success').attr('disabled', false).html('<i class="ri-check-fill"></i> Assign Plan');
    //         }
    //     });
    // });

    $('#assignPlanForm').submit(function(e){
        $('.btn-success').attr('disabled', true).text('Saving...');
        // e.preventDefault();

        // let formData = new FormData(this);

        // $.ajax({
        //     url: $(this).attr('action'),
        //     type: "POST",
        //     data: formData,
        //     dataType: "json",
        //     contentType: false,
        //     processData: false,
        //     beforeSend:function(){
        //         $('.btn-success').attr('disabled', true).text('Saving...');
        //     },
        //     success:function(res){
        //         if(res.status == true){
        //             $('#ajax_modal').modal('hide');
        //             location.reload();
        //         }else{
        //             toastr.error(res.message);
        //         }
        //     },
        //     complete:function(){
        //         $('.btn-success').attr('disabled', false).html('<i class="ri-check-fill"></i> Assign Plan');
        //     }
        // });
    });
    
    // Init Select2 in modal
    $('.select2').select2({
        dropdownParent: $('#ajax_modal')
    });
</script>
