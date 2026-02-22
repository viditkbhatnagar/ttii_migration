<?php
    if (isset($edit_data)){
        ?>
        <form action="<?=base_url('admin/review/edit/'.$edit_data['id'])?>" method="post" enctype="multipart/form-data">
             <div class="row">
        
                <div class="col-4 form-group p-2">
                <label for="course_id" class="form-label">Course<span class="required text-danger">*</span></label>
                <select class="form-control select2" name="course_id" id="course_id" required onchange="get_subject(this.value)">
                    <option value="0">Select Course</option>
                    <?php foreach($course as $val){ ?>
                    <option value="<?=$val['id']?>"  <?=($edit_data['course_id']==$val['id']) ? 'selected' : '' ?>><?=$val['title']?></option>
                    <?php } ?>
                </select>
            </div>
            
            
            <div class="col-4 form-group p-2">
                <label for="user_id" class="form-label">Student<span class="required text-danger">*</span></label>
                <select class="form-control select2" name="user_id" id="user_id" required >
                    <option value="0">Select Student</option>
                    <?php foreach($users as $val){ ?>
                    <option value="<?=$val['id']?>"  <?=($edit_data['user_id']==$val['id']) ? 'selected' : '' ?>><?=$val['name']?></option>
                    <?php } ?>
                </select>
            </div>
            
    
           
            
            <div class="col-lg-4 p-2">
                <div>
                    <label for="rating" class="form-label">Rating<span class="required text-danger">*</span></label>
                    <input type="text" class="form-control" id="rating" name="rating"  value="<?=$edit_data['review'] ?>" required>
                </div>
            </div>
                
                <div class="col-lg-12 p-2">
                    <div>
                        <label for="location" class="form-label">Review</label>
                        <textarea class="form-control" name="review" rows="6"><?=$edit_data['review'] ?></textarea>
                    </div>
                </div>
        
                
            
                
                <div class="col-12 p-2">
                    <button class="btn btn-success float-end btn-save" type="submit">
                        <i class="ri-check-fill"></i> Save
                    </button>
                </div>
            </div>
            
            
            
        </form>
        <?php
    }
?>


<script>
    $('.numbersOnly').keypress(function(e) {
    var charCode = (e.which) ? e.which : event.keyCode;
    if (!String.fromCharCode(charCode).match(/[0-9]/)) {
        return false;
    }
});

$('.textOnly').keypress(function(e) {
    var charCode = (e.which) ? e.which : event.keyCode;
    if (!(/[a-zA-Z\s]/.test(String.fromCharCode(charCode)))) {
        return false;
    }
});
</script>