<?php
    if (isset($edit_data)){
        ?>
        <form action="<?=base_url('admin/packages/edit/'.$edit_data['id'])?>" method="post">
                <div class="row">
                    <div class="col-6 form-group p-2">
                    <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
                    <input type="text" class="form-control" id="title" name="title" placeholder="Title" required value="<?=$edit_data['title']?>">
                </div>
                <div class="col-6 form-group p-2">
                    <label for="course_id" class="form-label">Course<span class="required text-danger">*</span></label>
                    <select class="form-control select2" name="course_id" id="course_id" required>
                        <option value="0">None</option>
                        <?php foreach($course as $val){ ?>
                        <option value="<?=$val['id']?>" <?php if($edit_data["course_id"]==$val['id'])echo "selected"; ?>><?=$val['title']?></option>
                        <?php } ?>
                    </select>
                </div>
                <div class="col-6 form-group p-2">
                    <label for="amount" class="form-label">Amount<span class="required text-danger">*</span></label>
                    <input type="number" class="form-control" id="amount" name="amount" required value="<?=$edit_data['amount']?>">
                </div>
                <div class="col-6 form-group p-2">
                    <label for="discount" class="form-label">Discount<span class="required text-danger">*</span></label>
                    <input type="number" class="form-control" id="discount" name="discount" required value="<?=$edit_data['discount']?>">
                </div>
                
                <div class="col-6 form-group p-2">
                    <label for="start_date" class="form-label">Start Date<span class="required text-danger">*</span></label>
                    <input type="date" class="form-control" id="start_date" name="start_date" required value="<?=$edit_data['start_date']?>">
                </div>
                <div class="col-6 form-group p-2">
                    <label for="end_date" class="form-label">End Date<span class="required text-danger">*</span></label>
                    <input type="date" class="form-control" id="end_date" name="end_date" required value="<?=$edit_data['end_date']?>">
                </div>
                
                <div class="col-lg-12 p-2">
                    <label for="title" class="form-label">Features</label>
                    <textarea class="form-textarea" name="description" id="editor2"><?=$edit_data['description']?></textarea>
                </div>
        
                <div class="col-12 form-group p-2 d-none">
                    <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="1" name="is_free" id="is_free" <?php if($edit_data["is_free"]==1)echo "checked"; ?>>
                                <label class="form-check-label" for="is_free">Whether this course is free</label>
                            </div>
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
$(document).ready(function() {
 
    // Initialize the second editor with bullet list option only
    ClassicEditor
        .create(document.querySelector('#editor2'), {
            toolbar: ['bulletedList']
        })
        .then(editor => {
            console.log(editor);
        })
        .catch(error => {
            console.error(error);
        });
});
</script>