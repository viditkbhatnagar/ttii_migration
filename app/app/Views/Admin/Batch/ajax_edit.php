<?php
    if (isset($edit_data)){
        ?>
        <form action="<?=base_url('admin/batch/edit/'.$edit_data['id'])?>" method="post">
                <div class="row">
                    <div class="col-12 form-group p-2 d-none">
                        <label for="course_id" class="form-label">Course<span class="required text-danger">*</span></label>
                        <select class="form-control select2" name="course_id" id="course_id" >
                            <option value="0">None</option>
                            <?php foreach($course as $val){ ?>
                            <option value="<?=$val['id']?>"  <?php if($edit_data["course_id"]==$val['id'])echo "selected"; ?>   ><?=$val['title']?></option>
                            <?php } ?>
                        </select>
                    </div>

                    <div class="col-6 form-group p-2">
                        <label for="intake_month" class="form-label ">Intake Month<span class="required text-danger">*</span></label>
                        <select class="form-control select2" name="intake_month" id="intake_month">
                            <option value="" hidden>Choose Month</option>
                            <option value="1">January</option>
                            <option value="2">Febraury</option>
                            <option value="3">March</option>
                            <option value="4">April</option>
                            <option value="5">May</option>
                            <option value="6">June</option>
                            <option value="7">July</option>
                            <option value="8">August</option>
                            <option value="9">September</option>
                            <option value="10">October</option>
                            <option value="11">November</option>
                            <option value="12">December</option>
                        </select>
                    </div>

                    <div class="col-6 form-group p-2">
                        <label for="intake_year" class="form-label ">Intake Year<span class="required text-danger">*</span></label>
                        <select class="form-control select2" name="intake_year" id="intake_year">
                            <option value="" hidden>Choose Year</option>
                            <?php for($i = 2020; $i <= 2030; $i++) { ?>
                                <option value="<?= $i ?>" ><?= $i ?></option>
                            <?php } ?>

                        </select>
                    </div>  
                    
                    <div class="col-12 form-group p-2">
                        <label for="title" class="form-label">
                            Intake Title 
                            <small class="text-muted ms-1">(Choose Intake month & year)</small>
                            <span class="required text-danger">*</span>
                        </label>
                        <input type="text" class="form-control" readonly id="title" name="title" placeholder="Title" value="<?=$edit_data['title']?>" required>
                    </div>

                    <div class="col-12 form-group p-2">
                        <label for="title" class="form-label">Description</label>
                        <textarea class="form-control" name="description" rows="3"><?=$edit_data['description']?></textarea>
                    </div>

                    <div class="col-6 form-group p-2">
                        <label for="intake_status" class="form-label ">Status<span class="required text-danger">*</span></label>
                        <select class="form-control select2" name="status" id="intake_status">
                            <option value="1" <?= ($edit_data['status'] == 1 ? 'selected' : '') ?>>Active</option>
                            <option value="0" <?= ($edit_data['status'] == 0 ? 'selected' : '') ?>>Inactive</option>
                        </select>
                    </div>

                    <div class="col-12 p-2">
                        <button class="btn btn-success float-end btn-save" type="submit"><i class="ri-check-fill"></i>Save</button>
                    </div>
                </div>
            </form>
        <?php
    }
?>

<script>
    $(document).ready(function () {
        // Extract Month & Year from Title 
        const title = $("#title").val().trim(); // e.g., "March 2021"
        const match = title.match(/^([A-Za-z]+)\s+(\d{4})$/);


        if (match) {
            const monthName = match[1];
            const year = match[2];

            const monthMap = {'January': 1,'February': 2,'March': 3,'April': 4,'May': 5,'June': 6,
                'July': 7,'August': 8,'September': 9,'October': 10,'November': 11,'December': 12
            };

            const monthValue = monthMap[monthName];

            if (monthValue) {
                $('#intake_month').val(monthValue).trigger('change');
            }

            $('#intake_year').val(year).trigger('change');
        }

        $('#intake_month, #intake_year').on('change', function () {
            const monthText = $('#intake_month option:selected').text();
            const year = $('#intake_year').val();

            if (monthText && year) {
                $('#title').val(`${monthText} ${year}`);
            }
        });
    });
</script>
