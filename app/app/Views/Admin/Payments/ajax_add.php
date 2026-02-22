<form  action="<?=base_url('admin/payments/add')?>" method="post"  enctype="multipart/form-data">
    <div class="row">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body">
                    <div class="live-preview">
                        <div class="row">
                            <!--end col-->
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="name" class="form-label">Student<span class="required text-danger">*</span></label>
                                    <select class="form-control" name="user_id" id="user_id" onchange="get_course(this.value)">
                                        <option>Choose Student</option>
                                         <?php foreach($students as $student){ ?>                                        
                                            <option value="<?=$student['id']?>"><?=$student['name']?></option>
                                        <?php } ?>   
                                    </select>
                                </div>
                            </div>
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="name" class="form-label">Course<span class="required text-danger">*</span></label>
                                    <select class="form-control" name="course_id" id="course_id" onchange="fetch_course()">
                                        <option>Choose Course</option>
                                        <?php foreach($courses as $course){ ?>
                                            <option value="<?=$course['id']?>"><?=$course['title']?></option>
                                        <?php } ?>    
                                    </select>
                                </div>
                            </div>
                            <div class="col-lg-6 p-2 d-none">
                                <div>
                                    <label for="name" class="form-label">Package<span class="required text-danger">*</span></label>
                                    <select class="form-control" name="package_id" id="package_id" onchange="fetch_package()">
                                        <option>Choose Package</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-lg-6">
                                <div class="mt-3">
                                    <label class="form-label mb-0">Price<span class="required text-danger">*</span></label>
                                    <input type="number" class="form-control" name="price" id="price" required readonly>
                                </div>
                            </div>
                            <!-- <div class="col-lg-6 d-none">
                                <div class="mt-3">
                                    <label class="form-label mb-0">Discount(amount)<span class="required text-danger">*</span></label>
                                    <input type="number" class="form-control" name="discount" id="discount" required onkeyup="calculate()" value="">
                                </div>
                            </div> -->
                            <div class="col-lg-6 d-none">
                                <div class="mt-3">
                                    <label class="form-label mb-0">Coupon Code<span class="required text-danger">*</span></label>
                                    <select class="form-control"  name="coupon_id" id="coupon_id" required onchange="apply_coupon()">
                                         <option value="0">Select Coupon</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-lg-6 d-none">
                                <div class="mt-3">
                                    <label class="form-label mb-0">Amount Paid<span class="required text-danger">*</span></label>
                                    <input type="number" class="form-control" name="amount_paid" id="amount_paid" required readonly>
                                </div>
                            </div>
                            <div class="col-lg-6">
                                <div class="mt-3">
                                    <label class="form-label mb-0">Payment Mode<span class="required text-danger">*</span></label>
                                    <select class="form-control select2" data-toggle="select2" name="payment_mode" id="payment_mode" required onchange="generate_paymentID()">
                                        <option value="">Select Mode</option>
                                        <option value="man_">Manual</option>
                                        <option value="pay_">RazorPay</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-lg-6">
                                <div class="mt-3">
                                    <label class="form-label mb-0">Payment ID<span class="required text-danger">*</span></label>
                                    <input type="text" class="form-control" name="razorpay_payment_id" id="razorpay_payment_id">
                                </div>
                            </div>
                            <div class="col-lg-6">
                                <div class="mt-3">
                                    <label class="form-label mb-0">Remarks<span class="required text-danger">*</span></label>
                                    <input type="text" class="form-control" name="note" id="note">
                                </div>
                            </div>
                            <div class="col-12 p-2">
                                <button class="btn btn-success float-end btn-save" type="submit">
                                    <i class="ri-check-fill"></i> Save
                                </button>
                            </div>
                            
                        </div>
                        <!--end row-->
                    </div>
                </div>
            </div>
        </div>
        <!--end col-->
    </div>
</form>
<script>

    function fetch_package(){
        $package_id = $("[name=package_id]").val();
        $.ajax({url: "<?php echo site_url('Admin/Payments/ajax_get_package_by_id'); ?>/"+$package_id,dataType:"JSON", success: function(result){
            $("#price").val(result.amount); 
            $("#discount").val(result.discount); 
            $("#amount_paid").val(result.amount - result.discount); 
            fetch_coupons();
        }});  
    
    }

    function fetch_course(){
        $course_id = $("[name=course_id]").val();
        $.ajax({url: "<?php echo site_url('Admin/Payments/ajax_get_course_by_id'); ?>/"+$course_id,dataType:"JSON", success: function(result){
            $("#price").val(result.sale_price); 
            $("#discount").val(result.discount); 
            $("#amount_paid").val(result.sale_price); 
            fetch_coupons();
        }});  
    
    }
    
    function fetch_coupons(){
        var package_id = $('#package_id').val(); 
        var user_id = $("#user_id").val(); 
        $.ajax({
            url: '<?php echo base_url("Admin/Payments/ajax_get_coupons"); ?>',
            type: 'POST',
            data: {
                package_id: package_id,
                user_id: user_id
            },
            success: function(data) {
                // Append HTML options to select element
                $('#coupon_id').html(data);
            }
        });
    }

    function generate_paymentID(){
        $("#razorpay_payment_id").removeAttr('readonly');
        if($("#payment_mode").val()=='pay_'){
            $("#razorpay_payment_id").val('pay_'); 
        }
        else{
            id=Math.random().toString(36).substring(7);
            $("#razorpay_payment_id").val('man_'+id); 
            $("#razorpay_payment_id").attr('readonly','true');
        }
    }
    
    function calculate(){
        $price= $("#price").val();
        $discount = $("#discount").val();
        $("#amount_paid").val($price- $discount);  
    }

    function apply_coupon(){
        $coupon_id= $("#coupon_id").val();
        if($coupon_id>0){
            $.ajax({url: "<?php echo site_url('Admin/Payments/apply_coupon_by_id'); ?>/"+$coupon_id,dataType:"JSON", success: function(result){
                $price= $("#price").val();
                $discount = $("#discount").val(); 
                $amount_paid= $price-$discount;
                $offer= $amount_paid - Math.ceil(($amount_paid*result.discount_perc/100));
                $("#amount_paid").val($offer); 
            }});
        }
        else calculate();
    }
    


    function get_package(course_id){
        
     $.ajax({
                url: '<?php echo base_url("Admin/Live_class/get_package"); ?>',
                type: 'POST',
                data: { course_id: course_id },
                success: function(data) {
                    // Append HTML options to select element
                    $('#package_id').html(data);
                }
            });    
        
    }
</script>



<!-- Include FontAwesome Icon Picker JS -->
<script>
$(document).ready(function() {
    // Initialize icon picker
    $('#icon-picker-input').iconpicker({
        iconset: 'fontawesome5', // Set the icon set to FontAwesome 5
        cols: 8, // Number of columns
        rows: 4, // Number of rows
        placement: 'bottom', // Placement of the icon picker relative to the input field
        align: 'left', // Alignment of the icon picker relative to the input field
    });
    
     $('#image').change(function() {
        var file = this.files[0];
        if (file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var img = new Image();
                img.onload = function() {
                    var width = this.width;
                    var height = this.height;
                    if (width !== 400 || height !== 255) {
                        alert('Error: Image dimensions must be 400x255.');
                        // Reset the file input
                        $('#image').val('');
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
});




</script>
